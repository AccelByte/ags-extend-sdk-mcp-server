# Running Locally & Self-Hosting

Most users should connect to the hosted AGS Extend SDK MCP Server — see the [README](../README.md). This guide is for running the server yourself: a fully-local stdio setup, hosting the HTTP server, or developing from source.

## Contents

- [Run with Docker](#run-with-docker)
  - [STDIO transport (single language, fully local)](#stdio-transport-single-language-fully-local)
  - [Streamable HTTP transport (serves all languages)](#streamable-http-transport-serves-all-languages)
- [Environment Variables](#environment-variables)
- [HTTP endpoints](#http-endpoints)
- [Develop from source](#develop-from-source)
- [Release (push the container image)](#release-push-the-container-image)
- [Smoke-test the HTTP server](#smoke-test-the-http-server)

## Run with Docker

> [!IMPORTANT]
> Replace `<version>` in the examples below with the `ghcr.io/accelbyte/ags-extend-sdk-mcp-server` image tag that matches your AGS version. See the available tags [here](https://github.com/accelbyte/ags-extend-sdk-mcp-server/pkgs/container/ags-extend-sdk-mcp-server/versions).

### STDIO transport (single language, fully local)

Point your client at a local Docker process. The language is fixed by `CONFIG_DIR`. Example `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "extend-sdk": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm", "-e", "CONFIG_DIR",
        "ghcr.io/accelbyte/ags-extend-sdk-mcp-server:<version>"
      ],
      "env": {
        "CONFIG_DIR": "config/go"
      }
    }
  }
}
```

Set `CONFIG_DIR` to `config/csharp`, `config/go`, `config/java`, or `config/python`.

### Streamable HTTP transport (serves all languages)

```bash
docker run -p 3000:3000 \
  -e TRANSPORT=http \
  -e PORT=3000 \
  -e CONFIG_DIR=config/go \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  ghcr.io/accelbyte/ags-extend-sdk-mcp-server:<version>
```

Over HTTP the server loads **all** languages; clients select one via `/mcp/{language}`. `CONFIG_DIR` only sets the default served on the plain `/mcp` path. Point your client at `http://localhost:3000/mcp/go` (or another language).

## Environment Variables

- `TRANSPORT`: MCP server transport (`stdio`, `http`, `streamableHttp`; default: `stdio`)
- `PORT`: HTTP server port when `TRANSPORT` is `http` (default: `3000`)
- `MCP_PATH`: Base path the HTTP endpoint is mounted on (default: `/mcp`). The load balancer forwards the full path unchanged, so set this to match the routed prefix (e.g. `/extend-mcp`). Clients then connect to `<MCP_PATH>/{language}`.
- `CONFIG_DIR`: Base language directory (default: `config/go`). Its parent (`config`) is scanned and **every** language sub-directory is loaded.
  - **stdio**: selects the single language served by the process.
  - **http**: sets the default language on the plain `/mcp` path; clients select any language via `/mcp/{language}`.
  - Valid: `config/csharp`, `config/go`, `config/java`, `config/python`
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`; default: `info`)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed `Origin` header values for HTTP transport (optional). When set, requests with a disallowed origin are rejected (DNS-rebinding protection).
- `ALLOWED_HOSTS`: Comma-separated list of allowed `Host` header values for HTTP transport (optional). Set this to your deployment hostname(s) — e.g. behind a load balancer — to enable strict `Host` validation. When unset, any host is accepted.
- `TRUST_PROXY`: Number of proxy hops in front of the server (Express `trust proxy`; optional, default `0`). Behind a load balancer the client IP arrives via `X-Forwarded-For`; set this to `1` for a single ALB so rate limiting identifies clients correctly. Leave unset for local/direct use.
- `NODE_ENV`: `development` or `production` (optional, used by Express for HTTP transport)

## HTTP endpoints

When `TRANSPORT=http`, the server exposes (where `<MCP_PATH>` defaults to `/mcp`):

- `GET /health` — Health probe; returns `200 {"status":"ok"}`. Use this as the load balancer health check path. Always `/health`, independent of `MCP_PATH`.
- `POST|GET|DELETE <MCP_PATH>` — MCP endpoint using the default language (`CONFIG_DIR`).
- `POST|GET|DELETE <MCP_PATH>/{language}` — MCP endpoint for a specific language (`csharp`, `go`, `java`, `python`). Unknown languages return `400`.

## Develop from source

Prerequisites: Bash, Docker, Node.js 18+, and pnpm.

```bash
pnpm install            # install dependencies
pnpm dev                # run (stdio) in watch mode
TRANSPORT=http pnpm dev # run with HTTP transport
pnpm test               # run the test suite
pnpm build              # build to dist/
pnpm start              # run the built server (stdio)
docker build -t extend-sdk-mcp-server:latest .   # build the container image
```

## Release (push the container image)

```bash
GHCR_USERNAME=<your-username>
GHCR_PASSWORD=<your-password>
IMAGE_TAG=<version>    # e.g. 2026.3.2 — matches AGS release; bump patch for hotfix

docker buildx inspect extend-sdk-mcp-server-builder || docker buildx create --name extend-sdk-mcp-server-builder --use
echo "$GHCR_PASSWORD" | docker login ghcr.io --username "$GHCR_USERNAME" --password-stdin
docker buildx build -t ghcr.io/accelbyte/ags-extend-sdk-mcp-server:${IMAGE_TAG} --platform linux/amd64,linux/arm64 --push .
docker buildx rm --keep-state extend-sdk-mcp-server-builder
```

## Smoke-test the HTTP server

With the server running on HTTP transport, initialize a session (use `/mcp/{language}` to pick a language):

```bash
curl -N -H "Accept: application/json, text/event-stream" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
    http://localhost:3000/mcp/go
```

Then call a tool (reuse the `mcp-session-id` returned by `initialize`):

```bash
curl -N -H "Accept: application/json, text/event-stream" \
    -H "Content-Type: application/json" \
    -H "mcp-session-id: <session-id>" \
    -X POST \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search-symbols","arguments":{"query":"user"}}}' \
    http://localhost:3000/mcp/go
```
