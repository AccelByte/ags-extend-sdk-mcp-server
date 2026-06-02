// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { readFileSync } from 'node:fs';

import { z } from 'zod/v3';

// Single source of truth for the version: read it from package.json rather
// than duplicating the literal here. Resolves relative to this module, so it
// works both from src/ (tests) and dist/ (built/runtime).
const PKG = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string };

const DEFAULT_NAME = 'extend-sdk-mcp-server';
const DEFAULT_VERSION = PKG.version;
const DEFAULT_TRANSPORT = 'stdio';
const DEFAULT_PORT = 3000;
const DEFAULT_MCP_PATH = '/mcp';
const DEFAULT_CONFIG_DIR = 'config/go';

const TransportEnum = z.enum(['http', 'stdio', 'streamablehttp']);

const ConfigSchema = z.object({
  name: z.string().optional().default(DEFAULT_NAME),
  version: z.string().optional().default(DEFAULT_VERSION),
  // Normalize casing before validating so values like `streamableHttp` are accepted.
  transport: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.toLowerCase() : value),
      TransportEnum
    )
    .optional()
    .default(DEFAULT_TRANSPORT),
  port: z.coerce
    .number()
    .int()
    .min(0)
    .max(65535)
    .optional()
    .default(DEFAULT_PORT),

  // Base path the HTTP server mounts the MCP endpoint on (e.g. `/mcp` or
  // `/extend-mcp`). The ALB forwards the full path, so this must match the
  // listener rule's path prefix. Normalized to a leading slash, no trailing slash.
  mcpPath: z
    .string()
    .optional()
    .default(DEFAULT_MCP_PATH)
    .transform((value) => {
      const trimmed = value.trim();
      const withLead = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return withLead.length > 1 ? withLead.replace(/\/+$/, '') : withLead;
    }),

  // Number of proxy hops in front of the server (Express `trust proxy`).
  // Behind a load balancer (e.g. AWS ALB) the client IP arrives via
  // `X-Forwarded-For`; set this to `1` for a single ALB so rate limiting
  // identifies clients correctly. Defaults to `0` (no proxy) for local use.
  trustProxy: z.coerce.number().int().min(0).optional().default(0),

  // custom
  configDir: z.string().optional().default(DEFAULT_CONFIG_DIR),
});

type Config = z.infer<typeof ConfigSchema>;

function loadFromEnv(): Config {
  return ConfigSchema.parse({
    name: process.env.MCP_NAME,
    version: process.env.MCP_VERSION,
    port: process.env.MCP_PORT || process.env.PORT,
    transport: process.env.MCP_TRANSPORT || process.env.TRANSPORT,
    mcpPath: process.env.MCP_PATH,
    trustProxy: process.env.TRUST_PROXY,
    configDir: process.env.CONFIG_DIR,
  });
}

const CONFIG = loadFromEnv();

export { TransportEnum, Config, ConfigSchema, loadFromEnv, CONFIG };
