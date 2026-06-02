// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { randomUUID } from 'node:crypto';
import { Server as HttpServer } from 'http';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { McpServer as HLMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { BaseServer } from './types.js';
import SessionManager from '../session/manager.js';
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  getSymbols,
} from '../tools/symbols/const.js';
import logger from '../logger.js';

function createJsonRpcError(message: string, code: number = -32000) {
  return {
    jsonrpc: '2.0' as const,
    id: null,
    error: {
      code,
      message,
    },
  };
}

/**
 * Parse a comma-separated env value into a trimmed, non-empty list,
 * or undefined when unset/empty.
 */
function parseList(value?: string): Array<string> | undefined {
  if (!value) {
    return undefined;
  }
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Resolve the SDK language for a connection from the request path.
 * Returns the fallback language when none is requested (plain `/mcp`),
 * or `null` when the requested language is not available.
 */
function resolveLanguage(
  requested: string | undefined,
  available: Array<string>,
  fallback: string
): string | null {
  if (requested === undefined) {
    return fallback;
  }
  return available.includes(requested) ? requested : null;
}

class StreamableHttpServer extends BaseServer {
  private readonly port: number;

  private readonly transports: Map<string, StreamableHTTPServerTransport>;

  private readonly app: express.Application;

  private server: HttpServer | undefined;

  /** Exposes the configured Express app (used by tests via supertest). */
  public get expressApp(): express.Application {
    return this.app;
  }

  constructor(
    name: string,
    version: string,
    port: number,
    sessionManager: SessionManager
  ) {
    super(name, version, sessionManager);
    this.port = port;
    this.transports = new Map();
    this.app = express();
    // Health check for the load balancer. Registered before the rate limiter
    // so frequent probes are never throttled.
    this.app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
          },
        },
      })
    );
    this.app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
        credentials: true,
        methods: ['GET', 'POST', 'DELETE'],
      })
    );
    this.app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per windowMs
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      })
    );
    this.app.use(express.json({ limit: '10mb' }));
    // `/mcp` uses the default language; `/mcp/:lang` selects an SDK language
    // (e.g. `/mcp/python`). The `:lang` segment is matched by the existing
    // `/mcp/*` ALB listener rule, so no infrastructure change is required.
    this.app.post(['/mcp', '/mcp/:lang'], this.handleRequest.bind(this));
    this.app.get(['/mcp', '/mcp/:lang'], this.handleSessionRequest.bind(this));
    this.app.delete(
      ['/mcp', '/mcp/:lang'],
      this.handleSessionRequest.bind(this)
    );
    this.server = undefined;
  }

  private async handleRequest(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && this.transports.has(sessionId)) {
      const cachedTransport = this.transports.get(sessionId);
      if (!cachedTransport) {
        res
          .status(400)
          .json(createJsonRpcError('Bad Request: Invalid session ID'));
        return;
      }
      transport = cachedTransport;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const language = resolveLanguage(
        req.params.lang,
        AVAILABLE_LANGUAGES,
        DEFAULT_LANGUAGE
      );
      if (language === null) {
        res
          .status(400)
          .json(
            createJsonRpcError(
              `Bad Request: Unknown language '${req.params.lang}'. Available: ${AVAILABLE_LANGUAGES.join(', ')}`
            )
          );
        return;
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          this.transports.set(newSessionId, transport);
          this.sessionManager.createSession(newSessionId);
        },
        enableJsonResponse: true,
        enableDnsRebindingProtection: true,
        allowedHosts: parseList(process.env.ALLOWED_HOSTS),
        allowedOrigins: parseList(process.env.ALLOWED_ORIGINS),
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          this.transports.delete(transport.sessionId);
          this.sessionManager.deleteSession(transport.sessionId);
        }
      };

      const server = new HLMcpServer({
        name: this.name,
        version: this.version,
      });

      this.setup(server, { language, symbols: getSymbols(language) });

      await server.connect(transport);
    } else {
      res
        .status(400)
        .json(createJsonRpcError('Bad Request: No valid session ID provided'));
      return;
    }

    await transport.handleRequest(req, res, req.body);
  }

  private async handleSessionRequest(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      res
        .status(400)
        .json(createJsonRpcError('Bad Request: No valid session ID provided'));
      return;
    }

    const transport = this.transports.get(sessionId);
    if (!transport) {
      res
        .status(400)
        .json(createJsonRpcError('Bad Request: Transport not found'));
      return;
    }

    await transport.handleRequest(req, res, req.body);
  }

  public async start(): Promise<void> {
    this.server = this.app
      .listen(this.port, () => {
        logger.info(
          `Server is running on http://localhost:${this.port}/mcp ` +
            `(languages: ${AVAILABLE_LANGUAGES.join(', ')}; default: ${DEFAULT_LANGUAGE})`
        );
      })
      .on('error', (error: Error) => {
        logger.error({ error }, 'Server error');
        process.exit(1);
      })
      .on('close', () => {
        logger.info('Server closed');
      });
  }

  public async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = undefined;
      this.transports.clear();
      this.sessionManager.clear();
    }
    logger.info('Server closed');
  }
}

export default StreamableHttpServer;
export { parseList, resolveLanguage };
