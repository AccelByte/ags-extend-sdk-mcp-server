import { config as loadEnv } from "dotenv";
import pino from "pino";

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

async function main() {
  const options = parseArgs();
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  await import('./streamableHttp.js');
}

main().catch((err) => {
  logger.fatal({ err: err instanceof Error ? err.message : String(err) }, "Server failed to start");
  process.exit(1);
});
