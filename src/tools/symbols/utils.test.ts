// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { describe, expect, it } from 'vitest';

import { Symbol } from './types.js';
import {
  calculateSymbolMatchScore,
  fuzzyMatch,
  levenshteinDistance,
  listLanguages,
  loadSymbols,
  loadSymbolRegistry,
  paginateSymbols,
  parseSearchTerms,
  symbolToSummary,
  truncateDescription,
  validatePaginationParams,
} from './utils.js';

const sampleSymbol = (overrides: Partial<Symbol> = {}): Symbol => ({
  id: 'CreateUser@iam.function',
  name: 'CreateUser',
  type: 'function',
  description: 'Creates a user account in the IAM service.',
  tags: ['user', 'iam'],
  ...overrides,
});

describe('parseSearchTerms', () => {
  it('returns an empty array for empty input', () => {
    expect(parseSearchTerms('')).toEqual([]);
  });

  it('splits on commas and whitespace and lowercases', () => {
    expect(parseSearchTerms('Create, User  account')).toEqual([
      'create',
      'user',
      'account',
    ]);
  });
});

describe('validatePaginationParams', () => {
  it('accepts valid params', () => {
    expect(() => validatePaginationParams(25, 0)).not.toThrow();
  });

  it('rejects non-positive limit, negative offset, and oversized limit', () => {
    expect(() => validatePaginationParams(0, 0)).toThrow(/limit must be/);
    expect(() => validatePaginationParams(10, -1)).toThrow(/offset must be/);
    expect(() => validatePaginationParams(2000, 0)).toThrow(/cannot exceed/);
  });
});

describe('paginateSymbols', () => {
  const symbols = Array.from({ length: 5 }, (_, i) =>
    sampleSymbol({ id: `S${i}`, name: `S${i}` })
  );

  it('returns a page and a next offset when more remain', () => {
    const page = paginateSymbols(symbols, 2, 0);
    expect(page.data).toHaveLength(2);
    expect(page.total).toBe(5);
    expect(page.next).toBe(2);
  });

  it('omits next on the last page', () => {
    const page = paginateSymbols(symbols, 2, 4);
    expect(page.data).toHaveLength(1);
    expect(page.next).toBeUndefined();
  });
});

describe('truncateDescription', () => {
  it('returns undefined for missing description', () => {
    expect(truncateDescription(undefined)).toBeUndefined();
  });

  it('truncates long descriptions with an ellipsis', () => {
    const long = 'a'.repeat(250);
    const result = truncateDescription(long, 200);
    expect(result).toHaveLength(203);
    expect(result?.endsWith('...')).toBe(true);
  });
});

describe('symbolToSummary', () => {
  it('keeps key fields and truncates the description', () => {
    const summary = symbolToSummary(
      sampleSymbol({ description: 'x'.repeat(250) })
    );
    expect(summary.id).toBe('CreateUser@iam.function');
    expect(summary.description?.endsWith('...')).toBe(true);
    expect(summary).not.toHaveProperty('example');
  });
});

describe('levenshteinDistance / fuzzyMatch', () => {
  it('computes edit distance', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });

  it('matches substrings and close misspellings', () => {
    expect(fuzzyMatch('user', 'createUser')).toBe(true); // substring match
    expect(fuzzyMatch('userr', 'user')).toBe(true); // 1 edit, similarity 0.8
    expect(fuzzyMatch('usr', 'user')).toBe(false); // similarity 0.75 < 0.8
    expect(fuzzyMatch('zzzzz', 'user')).toBe(false);
  });
});

describe('calculateSymbolMatchScore', () => {
  it('scores name matches higher than description matches', () => {
    const nameMatch = calculateSymbolMatchScore(sampleSymbol(), ['createuser']);
    const descMatch = calculateSymbolMatchScore(sampleSymbol(), ['account']);
    expect(nameMatch).toBeGreaterThan(descMatch);
    expect(descMatch).toBeGreaterThan(0);
  });
});

describe('listLanguages', () => {
  it('discovers the language directories under config/', async () => {
    const languages = await listLanguages('config');
    expect(languages).toEqual(['csharp', 'go', 'java', 'python']);
  });
});

describe('loadSymbols', () => {
  it('loads symbols for a language directory', async () => {
    const symbols = await loadSymbols('config/go');
    expect(symbols.length).toBeGreaterThan(0);
    symbols.forEach((s) => expect(s.id).toBeTruthy());
  });

  it('rejects paths outside the allowed config directory', async () => {
    await expect(loadSymbols('/etc')).rejects.toThrow(
      /Invalid configuration directory/
    );
  });
});

describe('loadSymbolRegistry', () => {
  it('loads every language into a keyed map', async () => {
    const registry = await loadSymbolRegistry('config');
    expect([...registry.keys()].sort()).toEqual([
      'csharp',
      'go',
      'java',
      'python',
    ]);
    [...registry.values()].forEach((symbols) => {
      expect(symbols.length).toBeGreaterThan(0);
    });
  });
});
