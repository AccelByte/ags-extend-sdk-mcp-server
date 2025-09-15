// In-memory registry with a stable ID of `${ns}/${name}` for each command.

export type JsonSchema = Record<string, any>; // keep lightweight

export type CommandDef = {
  ns: string;                // e.g., "demo"
  name: string;              // e.g., "hello"
  summary?: string;          // brief description for search results
  schema?: JsonSchema;       // JSON Schema for args (optional)
  examples?: Array<{         // Optional usage examples
    args: any;
    comment?: string;
  }>;
  run: (args: any, ctx: { signal: AbortSignal }) => Promise<any>;
};

export class CommandRegistry {
  private map = new Map<string, CommandDef>();

  key(ns: string, name: string) { return `${ns}/${name}`; }

  register(cmd: CommandDef) {
    const id = this.key(cmd.ns, cmd.name);
    if (this.map.has(id)) throw new Error(`Duplicate command: ${id}`);
    this.map.set(id, cmd);
  }

  get(ns: string, name: string) {
    const id = this.key(ns, name);
    const cmd = this.map.get(id);
    if (!cmd) throw new Error(`Unknown command: ${id}`);
    return cmd;
  }

  search(q: string, ns?: string, limit = 50, offset = 0) {
    const needle = (q || "").toLowerCase();
    const rows = [...this.map.values()].filter(c =>
      (!ns || c.ns.startsWith(ns)) &&
      (
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        (c.summary?.toLowerCase().includes(needle) ?? false) ||
        c.ns.toLowerCase().includes(needle)
      )
    );
    const slice = rows.slice(offset, offset + limit);
    return {
      items: slice.map(c => ({ ns: c.ns, name: c.name, summary: c.summary })),
      total: rows.length,
      nextOffset: offset + slice.length < rows.length ? offset + slice.length : undefined,
    };
  }
}

// ---- Built-in/demo commands registration ----
import { registerCommandsFromYaml } from "./registry-yaml.js";

export function registerBuiltins(reg: CommandRegistry) {
  registerCommandsFromYaml(reg);

  // TODO: For large catalogs, consider lazy-loading by namespace:
  // e.g., on first access to ns "aws", dynamically import("./commands/aws.js") and register.
}