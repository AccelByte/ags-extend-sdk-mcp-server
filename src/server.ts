import { config as loadEnv } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import pino from "pino";
import type { IncomingMessage, ServerResponse } from "http";
import { Config as ConfigType, FunctionDef, Struct } from "./types.js";
import { loadConfigFromFile, loadConfigFromDir } from "./config.js";
import {
  calculateFunctionMatchScore,
  calculateStructMatchScore,
  paginateResults,
  parseSearchQuery,
} from "./helpers.js";

loadEnv();

function parseArgs() {
  const args = process.argv.slice(2);
  const options: { help?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      console.error(`Error: Unknown argument: ${arg}`);
      console.error("Use --help to see available options");
      process.exit(1);
    }
  }
  return options;
}

function showHelp() {
  console.log(`
Usage: node dist/server.js [options]

Options:
  -h, --help                  Show this help message

Environment Variables:
  PORT                        HTTP server port (default: 3000)
  LOG_LEVEL                   Logging level (default: info)
  CONFIG_FILE                 Path to a single YAML config file
  CONFIG_DIR                  Path to a directory of YAML config files
`);
}

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

function buildConfig(): ConfigType {
  const file = process.env.CONFIG_FILE;
  const dir = process.env.CONFIG_DIR;
  if (file) return loadConfigFromFile(file);
  return loadConfigFromDir(dir ?? process.cwd());
}

const server = new McpServer(
  { name: "extend-sdk-mcp-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

let configData: ConfigType = { structs: {}, functions: {} };

function registerTools() {
  const SEARCH_FUNCTIONS_DESCRIPTION = `Search for functions by name, tags, or description with fuzzy matching support.

## Query Formats:
- Space-separated: 'user auth'
- Comma-separated: 'user, auth'
- With typos: 'authenicate' matches 'authenticate'

## Scoring Priority: name > tags > description

## Recommended Workflow:
1. Search: search_functions("user creation") → get function IDs
2. Bulk Get: get_bulk_functions(function_ids=["AdminCreateUser@iam", "PublicCreateUser@iam", "OtherFunction@service"])
3. Analyze: Use detailed function information for implementation

## Example Usage:
- search_functions("authentication") → finds auth-related functions (paginated)
- search_functions("create, user") → finds user creation functions (paginated)
- search_functions("") → returns all functions (paginated)`;

  const SEARCH_MODELS_DESCRIPTION = `Search for models by name, tags, or description with fuzzy matching support.

## Query Formats:
- Space-separated: 'user profile'
- Comma-separated: 'user, profile'
- With typos: 'profil' matches 'profile'

## Scoring Priority: name > tags > description

## Recommended Workflow:
1. Search: search_models("user model") → get model IDs
2. Bulk Get: get_bulk_structs(struct_ids=["User@iam", "UserProfile@iam", "UserResponse@iam", "OtherStruct@service"])
3. Analyze: Use detailed struct information for instantiation and usage

## Example Usage:
- search_models("response") → finds response models (paginated)
- search_models("user, data") → finds user-related data models (paginated)
- search_models("") → returns all models (paginated)`;

  const GET_BULK_FUNCTIONS_DESCRIPTION = `Get multiple functions at once for efficient analysis with pagination.

## Parameter Format Examples:
✅ Correct: function_ids=["AdminCreateUserV4@iam", "AdminGetUserV4@iam", "OtherFunction@service"]
✅ Also correct: function_ids="AdminCreateUserV4@iam" (single string, auto-converted to array)
✅ All functions: function_ids=null (or omit parameter)

## Usage Patterns:
- Get all functions: get_bulk_functions(limit=100, offset=0) → returns all functions (paginated)
- Get single function: get_bulk_functions(function_ids="Function1@service") → returns one function
- Get multiple functions: get_bulk_functions(function_ids=["Function1@service", "Function2@service"]) → returns multiple functions

## Recommended Workflow:
1. Search: search_functions("user creation") → discover function IDs
2. Bulk: get_bulk_functions(function_ids=["AdminCreateUserV4@iam"]) → get detailed info
3. Analyze: Use function.parameters, function.return_type, function.example, function.imports, function.description for implementation`;

  const GET_BULK_STRUCTS_DESCRIPTION = `Get multiple structs at once for efficient analysis with pagination.

## Parameter Format Examples:
✅ Correct: struct_ids=["User@iam", "UserProfile@iam", "UserResponse@iam", "OtherStruct@service"]
✅ Also correct: struct_ids="User@iam" (single string, auto-converted to array)
✅ All structs: struct_ids=null (or omit parameter)

## Usage Patterns:
- Get all structs: get_bulk_structs(limit=100, offset=0) → returns all structs (paginated)
- Get single struct: get_bulk_structs(struct_ids="UserProfile@iam") → returns one struct
- Get multiple structs: get_bulk_structs(struct_ids=["UserProfile@iam", "Struct@service"]) → returns multiple structs

## Recommended Workflow:
1. Search: search_models("user model") → discover model IDs
2. Bulk: get_bulk_structs(struct_ids=["UserProfile@iam"]) → get detailed info
3. Analyze: Use struct.fields, struct.imports, struct.description for instantiation and usage`;
  const describeFunctionSchema = { id: z.string() };
  const describeStructSchema = { id: z.string() };
  const searchSchema = {
    query: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
  };
  const bulkFunctionsSchema = {
    function_ids: z.union([z.string(), z.array(z.string())]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
  };
  const bulkStructsSchema = {
    struct_ids: z.union([z.string(), z.array(z.string())]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
  };

  server.registerTool("describe_function", {
    description: "Get detailed information about a specific function by its ID.",
    inputSchema: describeFunctionSchema,
  }, async (args: { id: string }) => {
    const fn = configData.functions[args.id];
    return { content: [{ type: "text", text: JSON.stringify(fn ?? null) }] };
  });

  server.registerTool("describe_struct", {
    description: "Get detailed information about a specific struct by its ID.",
    inputSchema: describeStructSchema,
  }, async (args: { id: string }) => {
    const st = configData.structs[args.id];
    return { content: [{ type: "text", text: JSON.stringify(st ?? null) }] };
  });

  server.registerTool("search_functions", {
    description: SEARCH_FUNCTIONS_DESCRIPTION,
    inputSchema: searchSchema,
  }, async (args: { query?: string; limit?: number; offset?: number }) => {
    const terms = parseSearchQuery(args.query ?? "");
    let results: FunctionDef[];
    if (terms.length === 0) {
      results = Object.values(configData.functions).sort((a, b) =>
        a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
      );
    } else {
      const scored: Array<[number, FunctionDef]> = [];
      for (const fn of Object.values(configData.functions)) {
        const score = calculateFunctionMatchScore(terms, fn, true);
        if (score > 0) scored.push([score, fn]);
      }
      scored.sort((a, b) => (b[0] - a[0]) || a[1].name.localeCompare(b[1].name));
      results = scored.map(([, f]) => f);
    }
    const { data, total, next } = paginateResults(results, args.limit ?? 25, args.offset ?? 0);
    return { content: [{ type: "text", text: JSON.stringify({ data, total, next }) }] };
  });

  server.registerTool("search_models", {
    description: SEARCH_MODELS_DESCRIPTION,
    inputSchema: searchSchema,
  }, async (args: { query?: string; limit?: number; offset?: number }) => {
    const terms = parseSearchQuery(args.query ?? "");
    let results: Struct[];
    if (terms.length === 0) {
      results = Object.values(configData.structs).sort((a, b) =>
        a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
      );
    } else {
      const scored: Array<[number, Struct]> = [];
      for (const st of Object.values(configData.structs)) {
        const score = calculateStructMatchScore(terms, st, true);
        if (score > 0) scored.push([score, st]);
      }
      scored.sort((a, b) => (b[0] - a[0]) || a[1].name.localeCompare(b[1].name));
      results = scored.map(([, s]) => s);
    }
    const { data, total, next } = paginateResults(results, args.limit ?? 25, args.offset ?? 0);
    return { content: [{ type: "text", text: JSON.stringify({ data, total, next }) }] };
  });

  server.registerTool("get_bulk_functions", {
    description: GET_BULK_FUNCTIONS_DESCRIPTION,
    inputSchema: bulkFunctionsSchema,
  }, async (args: { function_ids?: string | string[]; limit?: number; offset?: number }) => {
    const ids = args.function_ids == null ? null : Array.isArray(args.function_ids) ? args.function_ids : [args.function_ids];
    const list = ids ? Object.entries(configData.functions).filter(([id]) => ids.includes(id)).map(([, v]) => v) : Object.values(configData.functions);
    const { data, total, next } = paginateResults(list, args.limit ?? 100, args.offset ?? 0);
    return { content: [{ type: "text", text: JSON.stringify({ data, total, next }) }] };
  });

  server.registerTool("get_bulk_structs", {
    description: GET_BULK_STRUCTS_DESCRIPTION,
    inputSchema: bulkStructsSchema,
  }, async (args: { struct_ids?: string | string[]; limit?: number; offset?: number }) => {
    const ids = args.struct_ids == null ? null : Array.isArray(args.struct_ids) ? args.struct_ids : [args.struct_ids];
    const list = ids ? Object.entries(configData.structs).filter(([id]) => ids.includes(id)).map(([, v]) => v) : Object.values(configData.structs);
    const { data, total, next } = paginateResults(list, args.limit ?? 100, args.offset ?? 0);
    return { content: [{ type: "text", text: JSON.stringify({ data, total, next }) }] };
  });
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  configData = buildConfig();
  registerTools();

  // Create the HTTP transport with session management
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: false, // Use SSE streaming
    enableDnsRebindingProtection: false, // Disable for local development
  });

  // Connect the MCP server to the transport (this will start the transport automatically)
  await server.connect(transport);

  const port = Number(process.env.PORT ?? 3000);
  const { createServer } = await import("http");
  const server_http = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      await transport.handleRequest(req, res);
    } catch (e) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Internal server error" }, id: null }));
      }
    }
  });
  server_http.listen(port, () => logger.info({ port }, "HTTP server listening and ready"));

  // Graceful shutdown handlers
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn("Already shutting down, forcing exit...");
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info({ signal }, "Received shutdown signal, starting graceful shutdown...");

    try {
      await new Promise<void>((resolve, reject) => {
        server_http.close((err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      logger.info("HTTP server closed");

      await server.close();
      logger.info("MCP server closed");

      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      logger.error({ error: (error as any)?.message ?? String(error) }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));

  process.on("uncaughtException", (error: any) => {
    logger.fatal({ error: error?.message, stack: error?.stack }, "Uncaught exception");
    process.exit(1);
  });
  process.on("unhandledRejection", (reason: any, promise: any) => {
    logger.fatal({ reason, promise }, "Unhandled promise rejection");
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err: err instanceof Error ? err.message : String(err) }, "Server failed to start");
  process.exit(1);
});


