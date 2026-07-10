# Extend SDK MCP Server Postman Collection

This directory contains a focused Postman collection for smoke-testing the Streamable HTTP MCP endpoint:

```text
Extend SDK MCP Server.postman_collection.json
```

The collection covers only the main MCP tool workflow:

1. `initialize` creates an MCP session and stores `MCP_SESSION_ID`.
2. `search-symbols` searches SDK symbols and stores the first result in `SYMBOL_IDS`.
3. `describe-symbols` fetches full details for `SYMBOL_IDS`.

## Import in Postman

Import `Extend SDK MCP Server.postman_collection.json`, then update the collection variables:

| Variable | Description | Hosted example | Local example |
|---|---|---|---|
| `BASE_URL` | Server origin with scheme and no trailing slash | `https://development.accelbyte.io` | `http://localhost:3000` |
| `MCP_PATH` | MCP path segment without slashes | `extend-mcp` | `mcp` |
| `LANGUAGE` | SDK language path segment | `go` | `go` |
| `SYMBOL_QUERY` | Query used by `search-symbols` | `user` | `inventory` |
| `SYMBOL_IDS` | JSON array used by `describe-symbols` | Auto-filled by search | `["AdminCreateUser@go.iam.fun"]` |

Postman joins path segments with `/`, so keep `MCP_PATH` slash-free. The collection URL is:

```text
{{BASE_URL}}/{{MCP_PATH}}/{{LANGUAGE}}
```

Run the requests in order. `describe-symbols` can run after `search-symbols` auto-fills `SYMBOL_IDS`, or after you set `SYMBOL_IDS` manually to a JSON array of symbol IDs.

## Run with Newman

```bash
newman run "tests/postman/Extend SDK MCP Server.postman_collection.json"
```

Override variables for another deployment:

```bash
newman run "tests/postman/Extend SDK MCP Server.postman_collection.json" \
  --env-var BASE_URL=http://localhost:3000 \
  --env-var MCP_PATH=mcp \
  --env-var LANGUAGE=python \
  --env-var SYMBOL_QUERY=inventory
```
