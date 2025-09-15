// Real MCP server implementation using the official Anthropic MCP SDK with HTTP transport

import { config } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import pino from "pino";
import { handleSearch, handleDescribe, handleRun, initializeTools } from "./tools.js";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options: { commandsFile?: string; help?: boolean } = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--commands-file' || arg === '-c') {
      if (i + 1 < args.length) {
        options.commandsFile = args[i + 1];
        i++; // Skip the next argument as it's the value
      } else {
        console.error('Error: --commands-file requires a file path');
        process.exit(1);
      }
    } else if (arg.startsWith('--commands-file=')) {
      options.commandsFile = arg.split('=')[1];
    } else if (arg.startsWith('-c=')) {
      options.commandsFile = arg.split('=')[1];
    } else {
      console.error(`Error: Unknown argument: ${arg}`);
      console.error('Use --help to see available options');
      process.exit(1);
    }
  }
  
  return options;
}

// Show help information
function showHelp() {
  console.log(`
Usage: node dist/adapter-http.js [options]

Options:
  -c, --commands-file <path>  Path to YAML file containing command definitions
                              (default: src/commands/commands.yaml)
  -h, --help                  Show this help message

Environment Variables:
  PORT                        HTTP server port (default: 3000)
  LOG_LEVEL                   Logging level (default: info)

Examples:
  node dist/adapter-http.js
  node dist/adapter-http.js --commands-file /path/to/custom-commands.yaml
  node dist/adapter-http.js -c ./my-commands.yaml
`);
}

// Load environment variables from .env file
config();

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Create the MCP server instance
const server = new McpServer(
  {
    name: "extend-sdk-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Zod schemas for inputs (required by MCP SDK)
const searchSchemaShape = {
  q: z.string().optional(),
  ns: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional()
};

const describeSchemaShape = {
  ns: z.string(),
  name: z.string()
};

const runSchemaShape = {
  ns: z.string(),
  name: z.string(),
  args: z.record(z.string(), z.any()).optional()
};

// Create full schemas for type inference
const searchSchema = z.object(searchSchemaShape);
const describeSchema = z.object(describeSchemaShape);
const runSchema = z.object(runSchemaShape);

// Register the tools using the proper MCP SDK API
server.registerTool("dispatch_search", {
  description: "Search for available commands",
  inputSchema: searchSchemaShape,
}, async (args: z.infer<typeof searchSchema>) => {
  logger.debug({ args }, 'Executing dispatch_search');
  try {
    const result = await handleSearch(args);
    logger.debug({ result: JSON.stringify(result) }, 'dispatch_search completed');
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'dispatch_search failed');
    throw error;
  }
});

server.registerTool("dispatch_describe", {
  description: "Get detailed information about a specific command",
  inputSchema: describeSchemaShape,
}, async (args: z.infer<typeof describeSchema>) => {
  logger.debug({ args }, 'Executing dispatch_describe');
  try {
    const result = await handleDescribe(args);
    logger.debug({ result: JSON.stringify(result) }, 'dispatch_describe completed');
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'dispatch_describe failed');
    throw error;
  }
});

server.registerTool("dispatch_run", {
  description: "Execute a specific command",
  inputSchema: runSchemaShape,
}, async (args: z.infer<typeof runSchema>) => {
  logger.debug({ args }, 'Executing dispatch_run');
  try {
    const result = await handleRun(args, { signal: AbortSignal.timeout(30_000) });
    logger.debug({ result: JSON.stringify(result) }, 'dispatch_run completed');
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'dispatch_run failed');
    throw error;
  }
});

// Create and start the HTTP transport
async function main() {
  // Parse command line arguments
  const options = parseArgs();
  
  // Show help and exit if requested
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  const port = Number(process.env.PORT ?? 3000);
  const commandsFile = options.commandsFile;

  // Initialize tools with custom commands file if provided (or default if none specified)
  initializeTools(commandsFile);

  logger.info({ port, commandsFile }, 'MCP server starting on HTTP port');

  // Create the HTTP transport with session management disabled for simpler local development
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Disable session management for local dev
    enableJsonResponse: false, // Use SSE streaming
    enableDnsRebindingProtection: false, // Disable for local development
  });

  // Connect the MCP server to the transport (this will start the transport automatically)
  await server.connect(transport);

  logger.info({ port }, 'MCP server started successfully');
  logger.info({ endpoint: `http://localhost:${port}/` }, 'SSE endpoint available');

  // Set up Express-like HTTP server to handle requests
  const http = await import('http');
  const server_http = http.createServer(async (req, res) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    logger.debug({ requestId, method: req.method, url: req.url }, 'Incoming HTTP request');

    try {
      await transport.handleRequest(req, res);
      logger.debug({ requestId }, 'HTTP request handled successfully');
    } catch (error) {
      logger.error({ requestId, error: error instanceof Error ? error.message : String(error) }, 'HTTP request error');
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Internal server error" },
          id: null
        }));
      }
    }
  });

  server_http.listen(port, () => {
    logger.info({ port }, 'HTTP server listening and ready');
  });
}

main().catch((error) => {
  logger.fatal({ error: error instanceof Error ? error.message : String(error) }, 'Failed to start MCP server');
  process.exit(1);
});