// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { McpServer as HLMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { BaseServer } from './types.js';
import SessionManager from '../session/manager.js';

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
    this.setup(this.server);
    await this.server.connect(this.transport);
  }

  public async stop(): Promise<void> {
    this.server.close();
  }
}

export default StdioServer;
