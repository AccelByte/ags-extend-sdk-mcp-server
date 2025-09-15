# Accelbyte jssdk MCP (search, describe, run)

This project uses a scalable pattern for exposing **thousands of commands** via only three tools:

- `dispatch.search` – discover commands by text / namespace
- `dispatch.describe` – fetch JSON Schema + examples for one command (on demand)
- `dispatch.run` – execute a command by `{ ns, name, args }`

### Why this pattern?
- Keeps the MCP tool list tiny (fast handshake in clients)
- Lets you lazy‑load command catalogs by namespace
- Gives LLMs enough structure to pick & call the right command

> ⚠️ This repo ships an **HTTP adapter for local testing** so you can curl the handlers immediately. For a real MCP server, wire `tools.ts` into your MCP SDK (see `src/adapter-stdio.ts` for a sketch).

## Quick start (HTTP test adapter)

```bash
pnpm i  # or npm i / yarn
pnpm dev:http
# Server listens at http://localhost:3000
```

Try the three endpoints (simple JSON over HTTP for demo):

```bash
# 1) SEARCH
curl -s http://localhost:3000/tools/search?q=hello | jq

# 2) DESCRIBE
curl -s "http://localhost:3000/tools/describe?ns=demo&name=hello" | jq

# 3) RUN
curl -s -X POST http://localhost:3000/tools/run \
  -H 'content-type: application/json' \
  -d '{"ns":"demo","name":"hello","args":{"name":"Tony"}}' | jq
```

## Integrating with a real MCP server
- Import `registerBuiltins(registry)` from `src/registry.ts` to load commands.
- Use the three handlers from `src/tools.ts` and register them as MCP tools:
  - `dispatch.search` (input schema in code)
  - `dispatch.describe`
  - `dispatch.run`
- See `src/adapter-stdio.ts` for a **pseudo** wiring example; replace with your chosen MCP SDK's server registration.

## Add your own command namespaces
- Create a new file under `src/commands/yourNs.ts` and export `register(reg)`.
- Inside, call `reg.register({ ns, name, schema, summary, examples, run })` repeatedly.
- For large catalogs, lazy‑load by namespace in `registry.ts` (see TODO note there).