
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Config as ConfigType } from "./types.js";
import { createServer } from "./server.js";
import { loadConfigFromDir } from "./config.js";
import { getLogger } from "./logger.js";

const logger = getLogger();

function buildConfig(): ConfigType {
    const dir = process.env.CONFIG_DIR;
    return loadConfigFromDir(dir ?? "config/go");
}

const configData = buildConfig();



const mcpTransport = new StdioServerTransport();
const mcpServer = createServer(configData);

await mcpServer.connect(mcpTransport);

logger.info("STDIO server listening and ready");

// Cleanup on exit
process.on("SIGINT", async () => {
    await mcpServer.close();
    process.exit(0);
});
