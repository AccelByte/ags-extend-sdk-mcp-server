// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { afterEach, describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

import { loadFromEnv } from './config.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string };

const TRANSPORT_VARS = ['MCP_TRANSPORT', 'TRANSPORT', 'MCP_PATH'];

afterEach(() => {
  TRANSPORT_VARS.forEach((key) => delete process.env[key]);
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
