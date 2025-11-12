// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { z } from 'zod/v3';

import { McpServer as HLMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { RECOMMENDED_WORKFLOW, SYMBOLS } from './const.js';
import { Symbol, PaginatedSymbolSchema } from './types.js';
import { paginateSymbols, validatePaginationParams } from './utils.js';

const DESCRIBE_TOOL_DESCRIPTION = `Describe multiple symbols with pagination.

## Usage Patterns:
- describe_symbols(limit: 100, offset: 0) → returns the first 100 symbols (paginated)
- describe_symbols(ids: ["UserProfile@iam.model"]) → returns one symbol (paginated)
- describe_symbols(ids: ["Store@platform.model", "PublishStore@platform.function"]) → returns multiple symbols (paginated)

${RECOMMENDED_WORKFLOW}
`.trim();

function describeSymbolsTool(server: HLMcpServer) {
  server.registerTool(
    'describe-symbols',
    {
      title: 'Describe symbols',
      description: DESCRIBE_TOOL_DESCRIPTION,
      inputSchema: {
        ids: z
          .array(z.string())
          .describe(
            'List of symbol IDs used to fetch detailed information for each symbol.'
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
      },
      outputSchema: {
        result: PaginatedSymbolSchema,
      },
    },
    async ({
      ids,
      limit,
      offset,
    }: {
      ids: string[];
      limit: number;
      offset: number;
    }) => {
      validatePaginationParams(limit, offset);

      const symbols: Array<Symbol> = [];

      SYMBOLS.forEach((symbol) => {
        if (ids.length > 0) {
          if (ids.includes(symbol.id)) {
            symbols.push(symbol);
          }
        } else {
          symbols.push(symbol); // return all symbols if no IDs are provided
        }
      });

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

export default describeSymbolsTool;
