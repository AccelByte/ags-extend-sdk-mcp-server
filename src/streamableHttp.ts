import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Config as ConfigType } from "./types.js";
import { loadConfigFromDir } from "./config.js";
import { createServer } from "./server.js";
import http from "http";
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

const mcpServer = createServer(configData);

const mcpTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
});

await mcpServer.connect(mcpTransport);

const httpPort = Number(process.env.PORT ?? 3000);
const httpServer = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
        await mcpTransport.handleRequest(req, res);
    } catch (e) {
        if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Internal server error" }, id: null }));
        }
    }
});

httpServer.listen(httpPort, () => logger.info({ port: httpPort }, "HTTP server listening and ready"));

process.on('SIGINT', async () => {
    await mcpTransport!.close();
    process.exit(0);
});