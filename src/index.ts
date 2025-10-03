import { config as loadEnv } from "dotenv";
import { getLogger } from "./logger.js";

const logger = getLogger();

loadEnv({quiet: true});

async function main() {
  const transport = process.env.TRANSPORT ?? "stdio";
  if (transport === "stdio") {
    await import('./stdio.js');
  } else if (transport === "streamableHttp") {
    await import('./streamableHttp.js');
  } else {
    logger.error({ transport: transport }, "Invalid transport (valid transports: stdio, streamableHttp)");
    process.exit(1);
  }
}

main().catch((err) => {
  logger.fatal({ err: err instanceof Error ? err.message : String(err) }, "Server failed to start");
  process.exit(1);
});
