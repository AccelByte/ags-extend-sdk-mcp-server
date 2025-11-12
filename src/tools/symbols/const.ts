// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { CONFIG } from '../../config.js';
import logger from '../../logger.js';
import { Symbol } from './types.js';
import { loadSymbols } from './utils.js';

const SYMBOLS: Array<Symbol> = await (async () => {
  try {
    return await loadSymbols(CONFIG.configDir);
  } catch (error) {
    logger.error({ error }, 'Failed to load symbols');
    throw error;
  }
})();

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

export { RECOMMENDED_WORKFLOW, SYMBOLS };
