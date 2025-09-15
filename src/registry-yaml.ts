import { CommandRegistry, CommandDef } from "./registry.js";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import pino from "pino";

// Create logger instance for registry operations
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

// Get default commands file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const defaultCommandsFile = join(__dirname, "commands", "commands.yaml");

// Handler implementations
const handlers = {
  hello: async (cmd: any, args: any) => {
    const who = args?.name ?? "there";
    return { 
      message: `Hello, ${who}!`,
      command: `${cmd.ns}/${cmd.name}`,
      summary: cmd.summary
    };
  },
  
  time: async (cmd: any) => {
    return { 
      now: new Date().toISOString(),
      command: `${cmd.ns}/${cmd.name}`,
      summary: cmd.summary
    };
  },

  add: async (cmd: any, args: any) => {
    const { a, b } = args;
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Both a and b must be numbers');
    }
    return { 
      result: a + b, 
      operation: `${a} + ${b}`,
      command: `${cmd.ns}/${cmd.name}`,
      summary: cmd.summary
    };
  },

  uuid: async (cmd: any) => {
    return { 
      uuid: crypto.randomUUID(),
      command: `${cmd.ns}/${cmd.name}`,
      summary: cmd.summary
    };
  }
};

// Type for the JSON command structure
type JsonCommand = {
  ns: string;
  name: string;
  summary?: string;
  schema?: any;
  examples?: Array<{ args: any; comment?: string }>;
  handler?: keyof typeof handlers;
  handlerInline?: string; // JavaScript code as string
  staticData?: any; // Static data to return
};

// Load commands from YAML and register them
export function registerCommandsFromYaml(reg: CommandRegistry, commandsFile?: string) {
  // Determine which commands file to use
  const filePath = commandsFile ? resolve(commandsFile) : defaultCommandsFile;
  
  // Log which commands file is being loaded
  logger.info({ commandsFile: filePath }, 'Loading commands from YAML file');
  
  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`Commands file not found: ${filePath}`);
  }
  
  // Read and parse the YAML file
  const commandsData = yaml.load(
    readFileSync(filePath, "utf-8")
  ) as { commands: any[] };
  
  if (!commandsData || !commandsData.commands) {
    throw new Error(`Invalid YAML file format: ${filePath}. Expected 'commands' array.`);
  }
  
  const commands = commandsData.commands as JsonCommand[];
  
  // Log how many commands were loaded
  logger.info({ 
    commandsFile: filePath, 
    commandCount: commands.length 
  }, 'Successfully loaded commands from YAML file');
  
  for (const cmd of commands) {
    const { handler, handlerInline, staticData, ...cmdDef } = cmd;
    
    // Create the command definition
    const command: CommandDef = {
      ...cmdDef,
      run: async (args: any, ctx: { signal: AbortSignal }) => {
        // Check for static data first (highest priority)
        if (staticData !== undefined) {
          return {
            ...staticData,
            command: `${cmd.ns}/${cmd.name}`,
            summary: cmd.summary,
            type: 'static'
          };
        }
        
        // Try to use named handler second
        if (handler && handlers[handler]) {
          return await handlers[handler](cmd, args);
        }
        
        // Fall back to inline handler third
        if (handlerInline) {
          try {
            // Create a function from the inline code
            const inlineFunction = new Function('cmd', 'args', 'ctx', handlerInline);
            return await inlineFunction(cmd, args, ctx);
          } catch (error) {
            throw new Error(`Inline handler execution failed for command ${cmd.ns}/${cmd.name}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        // No handler found
        throw new Error(`No handler found for command ${cmd.ns}/${cmd.name}. Either 'staticData', 'handler', or 'handlerInline' must be defined.`);
      }
    };
    
    reg.register(command);
  }
}
