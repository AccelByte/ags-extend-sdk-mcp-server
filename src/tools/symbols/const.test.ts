// Copyright (c) 2025 AccelByte Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE, getSymbols } from './const.js';

describe('symbol registry', () => {
  it('exposes all bundled languages', () => {
    expect([...AVAILABLE_LANGUAGES].sort()).toEqual([
      'csharp',
      'go',
      'java',
      'python',
    ]);
  });

  it('defaults to the language from CONFIG_DIR (config/go)', () => {
    expect(DEFAULT_LANGUAGE).toBe('go');
  });

  it('returns the requested language symbol set', () => {
    expect(getSymbols('python').length).toBeGreaterThan(0);
    expect(getSymbols('java').length).toBeGreaterThan(0);
  });

  it('falls back to the default language for unknown or omitted languages', () => {
    const fallback = getSymbols(DEFAULT_LANGUAGE);
    expect(getSymbols('banana')).toBe(fallback);
    expect(getSymbols()).toBe(fallback);
  });
});
