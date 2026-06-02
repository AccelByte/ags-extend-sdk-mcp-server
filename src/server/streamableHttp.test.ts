// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { describe, expect, it } from 'vitest';
import request from 'supertest';

import StreamableHttpServer, {
  parseList,
  resolveLanguage,
} from './streamableHttp.js';
import SessionManager from '../session/manager.js';
import searchSymbolsTool from '../tools/symbols/searchTool.js';
import describeSymbolsTool from '../tools/symbols/describeTool.js';

function buildApp() {
  const server = new StreamableHttpServer(
    'test-server',
    '0.0.0',
    0,
    new SessionManager()
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
});

describe('HTTP endpoints', () => {
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
});
