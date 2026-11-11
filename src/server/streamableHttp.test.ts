// Copyright (c) 2025 AccelByte Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import request from 'supertest';

import StreamableHttpServer, {
  parseList,
  resolveLanguage,
} from './streamableHttp.js';
import SessionManager from '../session/manager.js';
import searchSymbolsTool from '../tools/symbols/searchTool.js';
import describeSymbolsTool from '../tools/symbols/describeTool.js';
import { AVAILABLE_LANGUAGES, getSymbols } from '../tools/symbols/const.js';

function buildApp(
  mcpPath?: string,
  trustProxy?: number,
  rateLimitMax?: number
) {
  const server = new StreamableHttpServer(
    'test-server',
    '0.0.0',
    0,
    new SessionManager(),
    mcpPath,
    trustProxy,
    rateLimitMax
  );
  server.modify(searchSymbolsTool);
  server.modify(describeSymbolsTool);
  return server.expressApp;
}

const INITIALIZE_BODY = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  },
};

describe('parseList', () => {
  it('returns undefined when unset or empty', () => {
    expect(parseList(undefined)).toBeUndefined();
    expect(parseList('')).toBeUndefined();
    expect(parseList('  ,  ')).toBeUndefined();
  });

  it('splits, trims, and drops empty entries', () => {
    expect(parseList('a.com, b.com ,,c.com')).toEqual([
      'a.com',
      'b.com',
      'c.com',
    ]);
  });
});

describe('resolveLanguage', () => {
  const available = ['go', 'python', 'java', 'csharp'];

  it('falls back when no language is requested', () => {
    expect(resolveLanguage(undefined, available, 'go')).toBe('go');
  });

  it('returns the requested language when available', () => {
    expect(resolveLanguage('python', available, 'go')).toBe('python');
  });

  it('returns null for an unavailable language', () => {
    expect(resolveLanguage('ruby', available, 'go')).toBeNull();
  });

  it('rejects array-valued route parameters', () => {
    expect(resolveLanguage(['python'], available, 'go')).toBeNull();
  });
});

describe('HTTP endpoints', () => {
  it.each(AVAILABLE_LANGUAGES)(
    'lists and calls tools with validated output for %s',
    async (language) => {
      const app = buildApp();
      const path = `/mcp/${language}`;
      const initialized = await request(app)
        .post(path)
        .set('Accept', 'application/json, text/event-stream')
        .send(INITIALIZE_BODY);
      expect(initialized.status).toBe(200);
      const sessionId = initialized.headers['mcp-session-id'];
      expect(sessionId).toBeTruthy();

      const rpc = (body: object) =>
        request(app)
          .post(path)
          .set('Accept', 'application/json, text/event-stream')
          .set('mcp-session-id', sessionId)
          .send({ jsonrpc: '2.0', ...body });

      try {
        const notification = await rpc({ method: 'notifications/initialized' });
        expect(notification.status).toBe(202);

        const listed = await rpc({ id: 2, method: 'tools/list' });
        expect(listed.status).toBe(200);
        expect(listed.body.error).toBeUndefined();
        expect(listed.body.result.tools).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'search-symbols',
              inputSchema: expect.objectContaining({ type: 'object' }),
              outputSchema: expect.objectContaining({ type: 'object' }),
            }),
            expect.objectContaining({ name: 'describe-symbols' }),
          ])
        );
        listed.body.result.tools.forEach((tool: { annotations?: object }) => {
          expect(tool.annotations).toEqual({
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          });
        });

        const searched = await rpc({
          id: 3,
          method: 'tools/call',
          params: { name: 'search-symbols', arguments: { query: '' } },
        });
        expect(searched.status).toBe(200);
        expect(searched.body.error).toBeUndefined();
        expect(searched.body.result.isError).not.toBe(true);
        const page = searched.body.result.structuredContent.result;
        expect(page.total).toBe(getSymbols(language).length);
        expect(page.data).toHaveLength(Math.min(25, page.total));
        expect(page.data.length).toBeGreaterThan(0);

        const { id } = page.data[0];
        const described = await rpc({
          id: 4,
          method: 'tools/call',
          params: { name: 'describe-symbols', arguments: { ids: [id] } },
        });
        expect(described.status).toBe(200);
        expect(described.body.error).toBeUndefined();
        expect(described.body.result.isError).not.toBe(true);
        expect(described.body.result.structuredContent.result).toEqual({
          data: [getSymbols(language).find((symbol) => symbol.id === id)],
          total: 1,
        });

        const invalid = await rpc({
          id: 5,
          method: 'tools/call',
          params: { name: 'search-symbols', arguments: { query: 123 } },
        });
        expect(invalid.body.result.isError).toBe(true);
      } finally {
        const closed = await request(app)
          .delete(path)
          .set('mcp-session-id', sessionId);
        expect(closed.status).toBe(200);
      }
    }
  );

  it('leaves trust proxy off by default and honors the configured value', () => {
    expect(buildApp().get('trust proxy')).toBe(false);
    expect(buildApp(undefined, 1).get('trust proxy')).toBe(1);
  });

  it('rate limits at the configured maximum', async () => {
    const app = buildApp(undefined, undefined, 2);
    const send = () =>
      request(app)
        .post('/mcp')
        .set('Accept', 'application/json, text/event-stream')
        .set('Content-Type', 'application/json')
        .send(INITIALIZE_BODY);
    const first = await send();
    expect(first.status).toBe(200);
    expect(first.headers['ratelimit-policy']).toBe('2;w=900');
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });

  it('serves the health check', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('rejects an unknown language with 400', async () => {
    const res = await request(buildApp())
      .post('/mcp/banana')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .send(INITIALIZE_BODY);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Unknown language 'banana'/);
  });

  it('initializes a session on a valid language path', async () => {
    const res = await request(buildApp())
      .post('/mcp/python')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .send(INITIALIZE_BODY);
    expect(res.status).toBe(200);
    expect(res.headers['mcp-session-id']).toBeTruthy();
  });

  it('initializes a session on the default /mcp path', async () => {
    const res = await request(buildApp())
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .send(INITIALIZE_BODY);
    expect(res.status).toBe(200);
    expect(res.headers['mcp-session-id']).toBeTruthy();
  });

  it('serves under a custom mcp path prefix', async () => {
    const app = buildApp('/extend-mcp');
    const ok = await request(app)
      .post('/extend-mcp/python')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .send(INITIALIZE_BODY);
    expect(ok.status).toBe(200);
    expect(ok.headers['mcp-session-id']).toBeTruthy();

    // The default `/mcp` prefix is not mounted when a custom path is set.
    const notFound = await request(app)
      .post('/mcp/python')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .send(INITIALIZE_BODY);
    expect(notFound.status).toBe(404);

    // Health stays at /health regardless of the mcp path prefix.
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
  });
});
