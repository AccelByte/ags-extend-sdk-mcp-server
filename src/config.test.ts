// Copyright (c) 2025 AccelByte Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

import { loadFromEnv } from './config.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string };

const ENV_VARS = [
  'MCP_TRANSPORT',
  'TRANSPORT',
  'MCP_PATH',
  'TRUST_PROXY',
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_WINDOW_MINS',
];

afterEach(() => {
  ENV_VARS.forEach((key) => delete process.env[key]);
});

describe('loadFromEnv version', () => {
  it('defaults to the package.json version', () => {
    expect(loadFromEnv().version).toBe(pkg.version);
  });
});

describe('loadFromEnv transport parsing', () => {
  it('defaults to stdio when unset', () => {
    expect(loadFromEnv().transport).toBe('stdio');
  });

  it('accepts canonical lowercase values', () => {
    process.env.MCP_TRANSPORT = 'http';
    expect(loadFromEnv().transport).toBe('http');
  });

  it('normalizes mixed-case streamableHttp to streamablehttp', () => {
    process.env.MCP_TRANSPORT = 'streamableHttp';
    expect(loadFromEnv().transport).toBe('streamablehttp');
  });

  it('rejects unknown transports', () => {
    process.env.MCP_TRANSPORT = 'carrier-pigeon';
    expect(() => loadFromEnv()).toThrow();
  });
});

describe('loadFromEnv mcpPath parsing', () => {
  it('defaults to /mcp when unset', () => {
    expect(loadFromEnv().mcpPath).toBe('/mcp');
  });

  it('keeps a valid custom path', () => {
    process.env.MCP_PATH = '/extend-mcp';
    expect(loadFromEnv().mcpPath).toBe('/extend-mcp');
  });

  it('adds a leading slash and strips trailing slashes', () => {
    process.env.MCP_PATH = 'extend-mcp/';
    expect(loadFromEnv().mcpPath).toBe('/extend-mcp');
  });
});

describe('loadFromEnv trustProxy parsing', () => {
  it('defaults to 0 (no proxy) when unset', () => {
    expect(loadFromEnv().trustProxy).toBe(0);
  });

  it('parses a numeric proxy-hop count', () => {
    process.env.TRUST_PROXY = '1';
    expect(loadFromEnv().trustProxy).toBe(1);
  });

  it('rejects a non-numeric value', () => {
    process.env.TRUST_PROXY = 'true';
    expect(() => loadFromEnv()).toThrow();
  });
});

describe('loadFromEnv rate limit parsing', () => {
  it('defaults to 100 requests per 15 minutes when unset', () => {
    const config = loadFromEnv();
    expect(config.rateLimitMax).toBe(100);
    expect(config.rateLimitWindowMins).toBe(15);
  });

  it('parses configured values', () => {
    process.env.RATE_LIMIT_MAX = '20000';
    process.env.RATE_LIMIT_WINDOW_MINS = '5';
    const config = loadFromEnv();
    expect(config.rateLimitMax).toBe(20000);
    expect(config.rateLimitWindowMins).toBe(5);
  });

  it('rejects a zero or non-numeric maximum', () => {
    process.env.RATE_LIMIT_MAX = '0';
    expect(() => loadFromEnv()).toThrow();
    process.env.RATE_LIMIT_MAX = 'lots';
    expect(() => loadFromEnv()).toThrow();
  });
});
