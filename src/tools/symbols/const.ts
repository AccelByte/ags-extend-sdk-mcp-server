// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { basename, dirname } from 'node:path';

import { CONFIG } from '../../config.js';
import logger from '../../logger.js';
import { Symbol } from './types.js';
import { loadSymbolRegistry } from './utils.js';

// `CONFIG.configDir` points at a single language directory (e.g. `config/go`).
// We treat its parent as the base directory and its name as the default language,
// then load every sibling language so one hosted server can serve them all.
const CONFIG_BASE_DIR = dirname(CONFIG.configDir);
const DEFAULT_LANGUAGE = basename(CONFIG.configDir);

const REGISTRY: Map<string, Array<Symbol>> = await (async () => {
  try {
    return await loadSymbolRegistry(CONFIG_BASE_DIR);
  } catch (error) {
    logger.error({ error }, 'Failed to load symbols');
    throw error;
  }
})();

const AVAILABLE_LANGUAGES: Array<string> = Array.from(REGISTRY.keys());

/**
 * Return the symbols for the given language, falling back to the default
 * language when the requested language is unknown or omitted.
 */
function getSymbols(language?: string): Array<Symbol> {
  if (language && REGISTRY.has(language)) {
    return REGISTRY.get(language)!;
  }
  return REGISTRY.get(DEFAULT_LANGUAGE) ?? [];
}

const RECOMMENDED_WORKFLOW = `
## Recommended Workflow:
1. Search: search_symbols(query: "user creation") → get the IDs of the symbols that match the query and other symbols that are referenced by the matched symbols.
2. Describe: describe_symbols(
    ids: [
        "CreateUser@iam.function",
        "CreateUserRequest@iam.model",
        "CreateUserResponse@iam.model"
    ]
)
3. Analyze: Use the symbol's description, imports, example, fields, parameters, and return_type for instantiation and usage information.
`.trim();

export {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  RECOMMENDED_WORKFLOW,
  getSymbols,
};
