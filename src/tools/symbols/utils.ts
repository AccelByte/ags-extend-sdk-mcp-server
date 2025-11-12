// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { access, readdir, readFile, stat } from 'node:fs/promises';
import { join, normalize, resolve } from 'node:path';

import yaml from 'js-yaml';

import { Symbol, PaginatedSymbol, ConfigSchema } from './types.js';
import logger from '../../logger.js';

const ALLOWED_BASE_DIR = resolve(process.cwd(), 'config');
const FUZZY_MATCH_THRESHOLD = 0.8;
const FUZZY_MATCH_TERM_MIN_LENGTH = 3;

async function loadSymbols(configDir: string): Promise<Array<Symbol>> {
  const resolvedDir = resolve(normalize(configDir));
  const allowedBaseDir = resolve(process.cwd(), ALLOWED_BASE_DIR);
  if (!resolvedDir.startsWith(allowedBaseDir)) {
    throw new Error('Invalid configuration directory path');
  }

  await access(resolvedDir);

  const ids = new Set<string>();
  const symbols: Array<Symbol> = [];

  const walk = async (dir: string) => {
    const files = await readdir(resolve(dir));
    await Promise.all(
      files.map(async (file) => {
        const path = join(dir, file);
        const statResult = await stat(path);
        if (statResult.isDirectory()) {
          await walk(path);
        } else if (
          statResult.isFile() &&
          (file.endsWith('.yaml') || file.endsWith('.yml'))
        ) {
          try {
            const data = yaml.load(await readFile(path, 'utf8'));
            const config = ConfigSchema.parse(data);
            Object.values(config.symbols).forEach((symbol) => {
              if (ids.has(symbol.id)) {
                throw new Error(`Symbol ID ${symbol.id} is duplicated.`);
              }
              ids.add(symbol.id);
              symbols.push(symbol);
            });
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            logger.error({ path, error: message }, 'Failed to load symbols');
            throw new Error(
              'Failed to load configuration. Please check server logs.'
            );
          }
        }
      })
    );
  };

  await walk(resolvedDir);

  return symbols;
}

function levenshteinDistance(s: string, t: string): number {
  const m = s.length;
  const n = t.length;

  // Create two work vectors of integer distances
  let v0: number[] = new Array(n + 1);
  let v1: number[] = new Array(n + 1);

  // Initialize v0 (the previous row of distances)
  // this row is A[0][i]: edit distance from an empty s to t;
  // that distance is the number of characters to append to s to make t.
  for (let i = 0; i <= n; i += 1) {
    v0[i] = i;
  }

  for (let i = 0; i < m; i += 1) {
    // Calculate v1 (current row distances) from the previous row v0

    // First element of v1 is A[i + 1][0]
    // edit distance is delete (i + 1) chars from s to match empty t
    v1[0] = i + 1;

    // Use formula to fill in the rest of the row
    for (let j = 0; j < n; j += 1) {
      // Calculating costs for A[i + 1][j + 1]
      const deletionCost = v0[j + 1] + 1;
      const insertionCost = v1[j] + 1;
      const substitutionCost = s[i] === t[j] ? v0[j] : v0[j] + 1;

      v1[j + 1] = Math.min(deletionCost, insertionCost, substitutionCost);
    }

    // Swap v0 with v1 for next iteration
    [v0, v1] = [v1, v0];
  }

  // After the last swap, the results of v1 are now in v0
  return v0[n];
}

function fuzzyMatch(
  term: string,
  text: string,
  threshold: number = FUZZY_MATCH_THRESHOLD,
  termMinLength: number = FUZZY_MATCH_TERM_MIN_LENGTH
): boolean {
  if (term.length === 0) {
    return false;
  }

  const termLower = term.toLowerCase();
  const textLower = text.toLowerCase();

  // Quick substring match - always check this first
  if (textLower.includes(termLower)) {
    return true;
  }

  // Only do fuzzy matching if term is long enough
  if (termLower.length < termMinLength) {
    return false;
  }

  // Check each word for fuzzy match
  const words = textLower.split(/\s+/);
  return words.some((word) => {
    // Skip very short words to avoid false positives
    if (word.length < 2) {
      return false;
    }

    const distance = levenshteinDistance(termLower, word);
    const similarity = 1 - distance / Math.max(termLower.length, word.length);

    return similarity >= threshold;
  });
}

function calculateSymbolMatchScore(
  symbol: Symbol,
  terms: Array<string>
): number {
  let score = 0;

  // Pre-normalize symbol fields to avoid repeated toLowerCase() calls
  const nameLower = symbol.name.toLowerCase();
  const descriptionLower = symbol.description?.toLowerCase();
  const tagsLower = symbol.tags?.map((tag) => tag.toLowerCase());

  terms.forEach((term) => {
    const termLower = term.toLowerCase();

    // Check name (highest priority)
    if (nameLower.includes(termLower)) {
      score += 100;
    } else if (fuzzyMatch(term, symbol.name)) {
      score += 50;
    }

    // Check tags
    if (symbol.tags && tagsLower) {
      symbol.tags.forEach((tag, index) => {
        if (tagsLower[index].includes(termLower)) {
          score += 15;
        } else if (fuzzyMatch(term, tag)) {
          score += 10;
        }
      });
    }

    // Check description (lowest priority)
    if (symbol.description && descriptionLower) {
      if (descriptionLower.includes(termLower)) {
        score += 10;
      } else if (fuzzyMatch(term, symbol.description)) {
        score += 8;
      }
    }
  });

  return score;
}

function parseSearchTerms(query: string): Array<string> {
  if (!query) {
    return [];
  }

  const terms = query.trim().split(/[,\s]+/);

  return terms
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 0);
}

function paginateSymbols(
  results: Array<Symbol>,
  limit: number,
  offset: number
): PaginatedSymbol {
  const end = Math.min(offset + limit, results.length);
  const next = end < results.length ? end : undefined;
  const data = results.slice(offset, end);

  return {
    data,
    total: results.length,
    next,
  };
}

function validatePaginationParams(
  limit: number,
  offset: number,
  maxLimit: number = 1000
): void {
  if (limit <= 0) throw new Error('limit must be positive');
  if (offset < 0) throw new Error('offset must be non-negative');
  if (limit > maxLimit) throw new Error(`limit cannot exceed ${maxLimit}`);
}

export {
  calculateSymbolMatchScore,
  fuzzyMatch,
  levenshteinDistance,
  loadSymbols,
  parseSearchTerms,
  paginateSymbols,
  validatePaginationParams,
};
