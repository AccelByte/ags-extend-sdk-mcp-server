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

class StreamableHttpServer extends BaseServer {
  private readonly port: number;

  private readonly transports: Map<string, StreamableHTTPServerTransport>;

  private readonly app: express.Application;

  private server: HttpServer | undefined;

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
    this.app.post('/mcp', this.handleRequest.bind(this));
    this.app.get('/mcp', this.handleSessionRequest.bind(this));
    this.app.delete('/mcp', this.handleSessionRequest.bind(this));
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
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          this.transports.set(newSessionId, transport);
          this.sessionManager.createSession(newSessionId);
        },
        enableJsonResponse: true,
        enableDnsRebindingProtection: true,
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

      this.setup(server);

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
        logger.info(`Server is running on http://localhost:${this.port}/mcp`);
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
