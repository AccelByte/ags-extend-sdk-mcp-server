// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { z } from 'zod/v3';

const DEFAULT_NAME = 'extend-sdk-mcp-server';
const DEFAULT_VERSION = '2025.8.1';
const DEFAULT_TRANSPORT = 'stdio';
const DEFAULT_PORT = 3000;
const DEFAULT_CONFIG_DIR = 'config/go';

const TransportEnum = z.enum(['http', 'stdio', 'streamablehttp']);

const ConfigSchema = z.object({
  name: z.string().optional().default(DEFAULT_NAME),
  version: z.string().optional().default(DEFAULT_VERSION),
  transport: TransportEnum.optional()
    .default(DEFAULT_TRANSPORT)
    .transform((s) => s.toLowerCase() as z.infer<typeof TransportEnum>),
  port: z.coerce
    .number()
    .int()
    .min(0)
    .max(65535)
    .optional()
    .default(DEFAULT_PORT),

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
    configDir: process.env.CONFIG_DIR,
  });
}

const CONFIG = loadFromEnv();

export { TransportEnum, Config, ConfigSchema, loadFromEnv, CONFIG };
