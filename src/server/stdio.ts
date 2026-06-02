// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { McpServer as HLMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { BaseServer } from './types.js';
import SessionManager from '../session/manager.js';
import { DEFAULT_LANGUAGE, getSymbols } from '../tools/symbols/const.js';

class StdioServer extends BaseServer {
  private readonly transport: StdioServerTransport;

  private readonly server: HLMcpServer;

  constructor(name: string, version: string, sessionManager: SessionManager) {
    super(name, version, sessionManager);
    this.transport = new StdioServerTransport();
    this.server = new HLMcpServer({
      name: this.name,
      version: this.version,
    });
  }

  public async start(): Promise<void> {
    // stdio serves a single language, fixed by CONFIG_DIR at startup.
    this.setup(this.server, {
      language: DEFAULT_LANGUAGE,
      symbols: getSymbols(DEFAULT_LANGUAGE),
    });
    await this.server.connect(this.transport);
  }

  public async stop(): Promise<void> {
    this.server.close();
  }
}

export default StdioServer;
