import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Config as ConfigType, FunctionDef, Struct } from "./types.js";
import {
  calculateFunctionMatchScore,
  calculateStructMatchScore,
  paginateResults,
  parseSearchQuery,
} from "./helpers.js";

export function createServer(configData: ConfigType): McpServer {
  const server = new McpServer(
    { name: "extend-sdk-mcp-server", version: "2025.8.0" },
    { capabilities: { tools: {} } }
  );
  const SEARCH_FUNCTIONS_DESCRIPTION = `Search for functions by name, tags, or description with fuzzy matching support.

## Query Formats:
- Space-separated: 'user auth'
- Comma-separated: 'user, auth'
- With typos: 'authenicate' matches 'authenticate'

## Scoring Priority: name > tags > description

## Recommended Workflow:
1. Search: search_functions("user creation") → get function IDs
2. Bulk Get: get_bulk_functions(function_ids=["AdminCreateUser@iam", "PublicCreateUser@iam", "OtherFunction@service"])
3. Analyze: Use detailed function information for implementation

## Example Usage:
- search_functions("authentication") → finds auth-related functions (paginated)
- search_functions("create, user") → finds user creation functions (paginated)
- search_functions("") → returns all functions (paginated)`;

  const SEARCH_MODELS_DESCRIPTION = `Search for models by name, tags, or description with fuzzy matching support.

## Query Formats:
- Space-separated: 'user profile'
- Comma-separated: 'user, profile'
- With typos: 'profil' matches 'profile'

## Scoring Priority: name > tags > description

## Recommended Workflow:
1. Search: search_models("user model") → get model IDs
2. Bulk Get: get_bulk_models(model_ids=["User@iam", "UserProfile@iam", "UserResponse@iam", "OtherStruct@service"])
3. Analyze: Use detailed struct information for instantiation and usage

## Example Usage:
- search_models("response") → finds response models (paginated)
- search_models("user, data") → finds user-related data models (paginated)
- search_models("") → returns all models (paginated)`;

  const GET_BULK_FUNCTIONS_DESCRIPTION = `Get multiple functions at once for efficient analysis with pagination.

## Parameter Format Examples:
✅ Correct: function_ids=["AdminCreateUserV4@iam", "AdminGetUserV4@iam", "OtherFunction@service"]
✅ Also correct: function_ids="AdminCreateUserV4@iam" (single string, auto-converted to array)
✅ All functions: function_ids=null (or omit parameter)

## Usage Patterns:
- Get all functions: get_bulk_functions(limit=100, offset=0) → returns all functions (paginated)
- Get single function: get_bulk_functions(function_ids="Function1@service") → returns one function
- Get multiple functions: get_bulk_functions(function_ids=["Function1@service", "Function2@service"]) → returns multiple functions

## Recommended Workflow:
1. Search: search_functions("user creation") → discover function IDs
2. Bulk: get_bulk_functions(function_ids=["AdminCreateUserV4@iam"]) → get detailed info
3. Analyze: Use function.parameters, function.return_type, function.example, function.imports, function.description for implementation`;

  const GET_BULK_MODELS_DESCRIPTION = `Get multiple models at once for efficient analysis with pagination.

## Parameter Format Examples:
✅ Correct: model_ids=["User@iam", "UserProfile@iam", "UserResponse@iam", "OtherStruct@service"]
✅ Also correct: model_ids="User@iam" (single string, auto-converted to array)
✅ All models: model_ids=null (or omit parameter)

## Usage Patterns:
- Get all models: get_bulk_models(limit=100, offset=0) → returns all structs (paginated)
- Get single struct: get_bulk_models(model_ids="UserProfile@iam") → returns one struct
- Get multiple models: get_bulk_models(model_ids=["UserProfile@iam", "Struct@service"]) → returns multiple structs

## Recommended Workflow:
1. Search: search_models("user model") → discover model IDs
2. Bulk: get_bulk_models(model_ids=["UserProfile@iam"]) → get detailed info
3. Analyze: Use struct.fields, struct.imports, struct.description for instantiation and usage`;
  const describeFunctionSchema = { id: z.string() };
  const describeStructSchema = { id: z.string() };
  const searchSchema = {
    query: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
  };
  const bulkFunctionsSchema = {
    function_ids: z.union([z.string(), z.array(z.string())]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
  };
  const bulkStructsSchema = {
    model_ids: z.union([z.string(), z.array(z.string())]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
  };

  server.registerTool("describe_function", {
    description: "Get detailed information about a specific function by its ID.",
    inputSchema: describeFunctionSchema,
  }, async (args: { id: string }) => {
    const fn = configData.functions[args.id];
    return { content: [{ type: "text", text: JSON.stringify(fn ?? null) }] };
  });

  server.registerTool("describe_model", {
    description: "Get detailed information about a specific model by its ID.",
    inputSchema: describeStructSchema,
  }, async (args: { id: string }) => {
    const st = configData.structs[args.id];
    return { content: [{ type: "text", text: JSON.stringify(st ?? null) }] };
  });

  server.registerTool("search_functions", {
    description: SEARCH_FUNCTIONS_DESCRIPTION,
    inputSchema: searchSchema,
  }, async (args: { query?: string; limit?: number; offset?: number }) => {
    const terms = parseSearchQuery(args.query ?? "");
    let results: FunctionDef[];
    if (terms.length === 0) {
      results = Object.values(configData.functions).sort((a, b) =>
        a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
      );
    } else {
      const scored: Array<[number, FunctionDef]> = [];
      for (const fn of Object.values(configData.functions)) {
        const score = calculateFunctionMatchScore(terms, fn, true);
        if (score > 0) scored.push([score, fn]);
      }
      scored.sort((a, b) => (b[0] - a[0]) || a[1].name.localeCompare(b[1].name));
      results = scored.map(([, f]) => f);
    }
    const { data, total, next } = paginateResults(results, args.limit ?? 25, args.offset ?? 0);
    return { content: [{ type: "text", text: JSON.stringify({ data, total, next }) }] };
  });

  server.registerTool("search_models", {
    description: SEARCH_MODELS_DESCRIPTION,
    inputSchema: searchSchema,
  }, async (args: { query?: string; limit?: number; offset?: number }) => {
    const terms = parseSearchQuery(args.query ?? "");
    let results: Struct[];
    if (terms.length === 0) {
      results = Object.values(configData.structs).sort((a, b) =>
        a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
      );
    } else {
      const scored: Array<[number, Struct]> = [];
      for (const st of Object.values(configData.structs)) {
        const score = calculateStructMatchScore(terms, st, true);
        if (score > 0) scored.push([score, st]);
      }
      scored.sort((a, b) => (b[0] - a[0]) || a[1].name.localeCompare(b[1].name));
      results = scored.map(([, s]) => s);
    }
    const { data, total, next } = paginateResults(results, args.limit ?? 25, args.offset ?? 0);
    return { content: [{ type: "text", text: JSON.stringify({ data, total, next }) }] };
  });

  server.registerTool("get_bulk_functions", {
    description: GET_BULK_FUNCTIONS_DESCRIPTION,
    inputSchema: bulkFunctionsSchema,
  }, async (args: { function_ids?: string | string[]; limit?: number; offset?: number }) => {
    const ids = args.function_ids == null ? null : Array.isArray(args.function_ids) ? args.function_ids : [args.function_ids];
    const list = ids ? Object.entries(configData.functions).filter(([id]) => ids.includes(id)).map(([, v]) => v) : Object.values(configData.functions);
    const { data, total, next } = paginateResults(list, args.limit ?? 100, args.offset ?? 0);
    return { content: [{ type: "text", text: JSON.stringify({ data, total, next }) }] };
  });

  server.registerTool("get_bulk_models", {
    description: GET_BULK_MODELS_DESCRIPTION,
    inputSchema: bulkStructsSchema,
  }, async (args: { model_ids?: string | string[]; limit?: number; offset?: number }) => {
    const ids = args.model_ids == null ? null : Array.isArray(args.model_ids) ? args.model_ids : [args.model_ids];
    const list = ids ? Object.entries(configData.structs).filter(([id]) => ids.includes(id)).map(([, v]) => v) : Object.values(configData.structs);
    const { data, total, next } = paginateResults(list, args.limit ?? 100, args.offset ?? 0);
    return { content: [{ type: "text", text: JSON.stringify({ data, total, next }) }] };
  });

  return server;
}



