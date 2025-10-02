import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Config as ConfigType } from "./types.js";
import { loadConfigFromDir } from "./config.js";
import { registerTools } from "./server.js";
import type { IncomingMessage, ServerResponse } from "http";
import pino from "pino";

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
    const dir = process.env.CONFIG_DIR;
    return loadConfigFromDir(dir ?? "config/go");
}

const configData = buildConfig();

// Call registerTools from server.ts and get the server
const server = registerTools(configData);

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

process.on('SIGINT', async () => {
    await transport!.close();
    process.exit(0);
});