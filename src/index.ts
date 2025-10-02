import { config as loadEnv } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import pino from "pino";
import type { IncomingMessage, ServerResponse } from "http";
import { Config as ConfigType } from "./types.js";
import { loadConfigFromFile, loadConfigFromDir } from "./config.js";
import { registerTools } from "./server.js";

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

async function main() {
  const options = parseArgs();
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const configData = buildConfig();

  const server = new McpServer(
    { name: "extend-sdk-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  // Call registerTools from server.ts
  registerTools(server, configData);

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
