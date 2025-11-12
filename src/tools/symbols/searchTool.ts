// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { z } from 'zod/v3';

import { McpServer as HLMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { RECOMMENDED_WORKFLOW, SYMBOLS } from './const.js';
import {
  SymbolTypeSchema,
  SymbolType,
  Symbol,
  PaginatedSymbolSchema,
} from './types.js';
import {
  calculateSymbolMatchScore,
  parseSearchTerms,
  paginateSymbols,
  validatePaginationParams,
} from './utils.js';

const SEARCH_TOOL_DESCRIPTION =
  `Search for symbols by name, tags, or description with fuzzy matching support.

## Usage Patterns:
- search_symbols(query: "auth") → finds auth-related symbols (paginated)
- search_symbols(query: "create, user") → finds user creation symbols (paginated)
- search_symbols(query: "") → returns all symbols (paginated)
- search_symbols(query: "stats", symbolType: "function") → finds stats-related function symbols (paginated)
- search_symbols(query: "stats", symbolType: "model") → finds stats-related model symbols (paginated)
- search_symbols(query: "", symbolType: "function") → returns all function symbols (paginated)
- search_symbols(query: "", symbolType: "model") → returns all model symbols (paginated)

${RECOMMENDED_WORKFLOW}
`.trim();

function searchSymbolsTool(server: HLMcpServer) {
  server.registerTool(
    'search-symbols',
    {
      title: 'Search symbols',
      description: SEARCH_TOOL_DESCRIPTION,
      inputSchema: {
        query: z
          .string()
          .describe(
            'Search terms for symbols (empty string returns all symbols).'
          ),
        limit: z
          .number()
          .int()
          .optional()
          .default(25)
          .describe('Maximum number of symbols to return (default: 25).'),
        offset: z
          .number()
          .int()
          .optional()
          .default(0)
          .describe('Offset for pagination (default: 0).'),
        symbolType: SymbolTypeSchema.optional().describe(
          'Type of symbols to return (default: null, meaning all types).'
        ),
      },
      outputSchema: {
        result: PaginatedSymbolSchema,
      },
    },
    async ({
      query,
      limit,
      offset,
      symbolType,
    }: {
      query: string;
      limit: number;
      offset: number;
      symbolType?: SymbolType;
    }) => {
      validatePaginationParams(limit, offset);

      const searchTerms = parseSearchTerms(query);
      const symbolsWithScores: Array<{ symbol: Symbol; score: number }> = [];

      SYMBOLS.forEach((symbol) => {
        if (!symbolType || symbol.type === symbolType) {
          if (searchTerms.length > 0) {
            const score = calculateSymbolMatchScore(symbol, searchTerms);
            if (score > 0) {
              symbolsWithScores.push({ symbol, score });
            }
          } else {
            symbolsWithScores.push({ symbol, score: 0 });
          }
        }
      });

      symbolsWithScores.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.symbol.name.localeCompare(b.symbol.name);
      });

      const symbols = symbolsWithScores.map((item) => item.symbol);
      const content = { result: paginateSymbols(symbols, limit, offset) };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(content),
          },
        ],
        structuredContent: content,
      };
    }
  );
}

export default searchSymbolsTool;
