# Extend SDK MCP Server

This project provides a **Model Context Protocol (MCP) server** that exposes Extend SDK functions and models as context to language models. It helps AI assistants and other MCP clients via six tools.

- **`search_functions`** – Search for functions by name, tags, description (fuzzy)
- **`search_models`** – Search for models by name, tags, description (fuzzy)
- **`describe_function`** – Get detailed information about a specific function by its ID
- **`describe_model`** – Get detailed information about a specific model by its ID
- **`get_bulk_functions`** – Retrieve multiple functions with pagination
- **`get_bulk_structs`** – Retrieve multiple structs with pagination

## Prerequisites

- Bash
- Curl
- Docker
- Makefile
- Node.js 18+ 
- pnpm

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `CONFIG_FILE`: Single YAML config file path
- `CONFIG_DIR`: Directory of YAML config files (recursive)
## Development

### Install dependencies

```bash
pnpm install
```

### Build MCP server

```bash
pnpm build
```

### Start MCP server

```bash
CONFIG_DIR=config pnpm start
```

### Start MCP server (development)

```bash
CONFIG_DIR=config pnpm dev
```

## Container

### Build MCP server container image

```bash
docker build -t extend-sdk-mcp-server:latest .
```

### Start MCP server container image

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e LOG_LEVEL=info \
  -e CONFIG_DIR=/app/config/default \
  extend-sdk-mcp-server:latest
```

## Testing

1. Initialize the MCP connection

    ```bash
    curl -N -H "Accept: application/json, text/event-stream" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
        http://localhost:3000/
    ```

2. List available tools

    ```bash
    curl -N -H "Accept: application/json, text/event-stream" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
        http://localhost:3000/
    ```

3. Test the search tool

    ```bash
    curl -N -H "Accept: application/json, text/event-stream" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_functions","arguments":{"query":"user"}}}' \
        http://localhost:3000/
    ```

4. Test describe model

    ```bash
    curl -N -H "Accept: application/json, text/event-stream" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"describe_model","arguments":{"id":"User@iam"}}}' \
        http://localhost:3000/
    ```

## Add to Cursor

1. Start the MCP server.

2. Create `.cursor/mcp.json` in your project with the following content.

    ```json
    {
      "mcpServers": {
        "extend-sdk-mcp-server": {
          "url": "http://localhost:3000/"
        }
      }
    }
    ```

3. Open `File` > `Preferences` > `Cursor Settings`, click `MCP`, and enable `extend-sdk-mcp-server`

## Sample prompts

- Search functions: "Search for functions related to 'user'"
- Get struct details: "Describe the 'User@iam' struct"
- Get function details: "Describe the 'AdminCreateUser@iam' function"
