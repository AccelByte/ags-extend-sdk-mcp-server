import { config as loadEnv } from "dotenv";
import { getLogger } from "./logger.js";

loadEnv({quiet: true});

function parseArgs() {
  const args = process.argv.slice(2);
  const options: { streamableHttp?: boolean, stdio?: boolean, help?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
      if (arg === "--help" || arg === "-h") {
        options.help = true;
    } else if (arg === "stdio") {
        options.stdio = true;
    } else if (arg === "streamableHttp") {
      options.streamableHttp = true;
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

const logger = getLogger();

async function main() {
  const options = parseArgs();
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  if (options.stdio) {
    await import('./stdio.js');
  } else if (options.streamableHttp) {
    await import('./streamableHttp.js');
  } else {
    await import('./stdio.js');
  }
}

main().catch((err) => {
  logger.fatal({ err: err instanceof Error ? err.message : String(err) }, "Server failed to start");
  process.exit(1);
});
