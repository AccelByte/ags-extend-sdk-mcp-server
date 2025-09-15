// Implements the three tools: dispatch.search, dispatch.describe, dispatch.run
// These handlers are framework-agnostic; wire them into MCP or use the HTTP adapter to test.

import { CommandRegistry } from "./registry.js";

export const registry = new CommandRegistry();

// Load demo commands; replace/extend as needed
import { registerBuiltins } from "./registry.js";

// Initialize tools with optional custom commands file
export function initializeTools(commandsFile?: string) {
  // Clear existing registry
  registry.clear();
  
  // Register commands with custom file if provided
  registerBuiltins(registry, commandsFile);
}

// ---- Input types ----
export type SearchInput = { q?: string; ns?: string; limit?: number; offset?: number };
export type DescribeInput = { ns: string; name: string };
export type RunInput = { ns: string; name: string; args?: any };

// ---- Tool handlers ----
export async function handleSearch(input: SearchInput) {
  const { q = "", ns, limit = 25, offset = 0 } = input;
  return registry.search(q, ns, Math.max(1, Math.min(200, limit)), Math.max(0, offset));
}

export async function handleDescribe(input: DescribeInput) {
  const cmd = registry.get(input.ns, input.name);
  return {
    ns: cmd.ns,
    name: cmd.name,
    summary: cmd.summary,
    schema: cmd.schema ?? { type: "object", additionalProperties: true },
    examples: cmd.examples ?? [],
  };
}

export async function handleRun(input: RunInput, ctx: { signal: AbortSignal }) {
  const cmd = registry.get(input.ns, input.name);
  // Optional: you could validate input.args against cmd.schema here using AJV/Zod.
  return await cmd.run(input.args ?? {}, ctx);
}