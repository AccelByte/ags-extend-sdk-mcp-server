// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { z } from 'zod/v3';

const FieldSchema = z
  .object({
    type: z
      .string()
      .describe(
        'Symbol name of the field. Use the "describe_symbols" tool to get more information.'
      ),
    required: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether the field is required.'),
    description: z.string().optional().describe('Description of the field.'),
  })
  .describe('Represents a field in a symbol definition.');

type Field = z.infer<typeof FieldSchema>;

const SymbolTypeSchema = z
  .enum(['function', 'model'])
  .describe(
    'Type of the symbol. This includes functions and models, which are the two main types of symbols in an SDK.'
  );

type SymbolType = z.infer<typeof SymbolTypeSchema>;

const SymbolSchema = z
  .object({
    id: z
      .string()
      .min(1, 'ID cannot be empty')
      .describe('Unique identifier for the symbol.'),
    name: z
      .string()
      .min(1, 'Name cannot be empty')
      .describe('Name of the symbol.'),
    type: SymbolTypeSchema.describe('Type of the symbol.'),
    description: z.string().optional().describe('Description of the symbol.'),
    tags: z
      .array(z.string())
      .optional()
      .describe('Tags associated with the symbol.'),
    imports: z
      .array(z.string())
      .optional()
      .describe('Imports required for the symbol.'),
    files: z
      .array(z.string())
      .optional()
      .describe('Files containing the symbol definition.'),
    example: z.string().optional().describe('Example usage of the symbol.'),
    parent: z
      .string()
      .optional()
      .describe('Parent symbol of the current symbol.'),
    fields: z.record(FieldSchema).optional().describe('Fields of the symbol.'),
    arguments: z
      .record(FieldSchema)
      .optional()
      .describe('Arguments of the symbol.'),
    returnType: z.string().optional().describe('Return type of the symbol.'),
  })
  .describe(
    'Represents a symbol definition with metadata and usage information.'
  );

type Symbol = z.infer<typeof SymbolSchema>;

function createPaginatedSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  itemsName: string
) {
  return z
    .object({
      data: z
        .array(itemSchema)
        .describe(`List of ${itemsName} matching the search criteria.`),
      total: z
        .number()
        .describe(`Total number of ${itemsName} matching the search criteria.`),
      next: z
        .number()
        .int()
        .optional()
        .describe(
          `Offset for the next page of ${itemsName} results, or null if this is the last page.`
        ),
    })
    .describe(`Represents a paginated list of ${itemsName}.`);
}

const PaginatedSymbolSchema = createPaginatedSchema(SymbolSchema, 'symbols');

type PaginatedSymbol = z.infer<typeof PaginatedSymbolSchema>;

const ConfigSchema = z
  .object({
    symbols: z.record(SymbolSchema).describe('Symbols map.'),
  })
  .describe('Configuration for the symbol tools.');

type Config = z.infer<typeof ConfigSchema>;

export {
  Field,
  FieldSchema,
  SymbolType,
  SymbolTypeSchema,
  Symbol,
  SymbolSchema,
  PaginatedSymbol,
  PaginatedSymbolSchema,
  Config,
  ConfigSchema,
};
