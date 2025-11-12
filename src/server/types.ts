// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { z } from 'zod/v3';

import { McpServer as HLMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Server as LLMcpServer } from '@modelcontextprotocol/sdk/server/index.js';

import SessionManager from '../session/manager.js';
import { SessionSchema } from '../session/types.js';

const ContextSchema = z.object({
  server: z.instanceof(LLMcpServer),
  session: SessionSchema,
});

const ToolHandlerSchema = z
  .function()
  .args(z.unknown(), ContextSchema)
  .returns(z.promise(z.any()));

type ToolHandler = z.infer<typeof ToolHandlerSchema>;

const ToolDefinitionSchema = z.object({
  name: z.string().min(1, 'Tool name is required'),
  title: z.string().min(1, 'Tool title is required'),
  description: z.string().min(1, 'Tool description is required'),
  inputSchema: z.any(),
  outputSchema: z.any(),
  handler: ToolHandlerSchema,
});

type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

const ToolMapSchema = z.map(z.string(), ToolDefinitionSchema);

type ToolMap = z.infer<typeof ToolMapSchema>;

type ModifyFunction = (server: HLMcpServer) => void;

interface Server {
  readonly name: string;
  readonly version: string;

  start(): Promise<void>;
  stop(): Promise<void>;
}

abstract class BaseServer implements Server {
  public readonly name: string;

  public readonly version: string;

  protected readonly sessionManager: SessionManager;

  private tools: ToolMap = new Map();

  private modifyFunctions: ModifyFunction[] = [];

  constructor(name: string, version: string, sessionManager: SessionManager) {
    this.name = name;
    this.version = version;
    this.sessionManager = sessionManager;
  }

  public addTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public modify(fn: ModifyFunction): void {
    this.modifyFunctions.push(fn);
  }

  protected setup(server: HLMcpServer): void {
    this.tools.forEach((tool) => {
      server.registerTool(
        tool.name,
        {
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
        },
        async (args, extra) => {
          const sessionId = extra?.sessionId;
          const session = sessionId
            ? this.sessionManager.getSession(sessionId)
            : this.sessionManager.getDefaultSession();

          return tool.handler(
            args,
            ContextSchema.parse({ server: server.server, session })
          );
        }
      );
    });

    this.modifyFunctions.forEach((fn) => fn(server));
  }

  public abstract start(): Promise<void>;
  public abstract stop(): Promise<void>;
}

export {
  Server,
  BaseServer,
  ContextSchema,
  ToolHandler,
  ToolHandlerSchema,
  ToolDefinition,
  ToolDefinitionSchema,
  ToolMap,
  ToolMapSchema,
};
