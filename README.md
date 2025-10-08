# Extend SDK MCP Server

This **Model Context Protocol (MCP) server** exposes Extend SDK functions and models as additional context to language models. It helps AI coding assistants and other MCP clients to answer questions and generate Extend SDK code by providing the following tools.

- **`search_functions`** – Search for functions by name, tags, description (fuzzy)
- **`search_models`** – Search for models by name, tags, description (fuzzy)
- **`describe_function`** – Get detailed information about a specific function by its ID
- **`describe_model`** – Get detailed information about a specific model by its ID
- **`get_bulk_functions`** – Retrieve multiple functions with pagination (experimental)
- **`get_bulk_models`** – Retrieve multiple models with pagination (experimental)

## Quickstart

### Prerequisites

- [Cursor](https://cursor.com/home)
- Docker
- Git

### Alternative 1: Using STDIO transport (default)

1. Clone this repository and build MCP server container image.

    ```bash
    docker build -t extend-sdk-mcp-server:latest .
    ```

2. Switch to your project directory and create `.cursor/mcp.json` with the following content.

    ```json
    {
      "mcpServers": {
        "extend-sdk-mcp-server": {
          "command": "docker",
          "args": [
            "run",
            "-i",
            "--rm",
            "-e",
            "CONFIG_DIR",
            "extend-sdk-mcp-server"
          ],
          "env": {
            "CONFIG_DIR": "config/go"
          }
        }
      }
    }
    ```

    The `CONFIG_DIR` value above is for Go Extend SDK. For other Extend SDK languages, see [here](#environment-variables).

3. Open your project directory in Cursor and open `File` > `Preferences` > `Cursor Settings`, In `Cursor Settings`, click `MCP`, and make sure `extend-sdk-mcp-server` is enabled.

### Alternative 2: Using Streamable HTTP transport

1. Clone this repository and build MCP server container image.

    ```bash
    docker build -t extend-sdk-mcp-server:latest .
    ```

2. Start the MCP server with streamable HTTP transport.

    ```bash
    docker run -p 3000:3000 \
      -e TRANSPORT=streamableHttp \
      -e PORT=3000 \
      -e CONFIG_DIR=config/go \
      -e NODE_ENV=production \
      -e LOG_LEVEL=info \
      extend-sdk-mcp-server:latest
    ```

    The `CONFIG_DIR` value above is for Go Extend SDK. For other Extend SDK languages, see [here](#environment-variables).

3. Switch to your project directory and create `.cursor/mcp.json` with the following content.

    ```json
    {
      "mcpServers": {
        "extend-sdk-mcp-server": {
          "url": "http://localhost:3000/"
        }
      }
    }
    ```

4. Open your project directory in Cursor and open `File` > `Preferences` > `Cursor Settings`, In `Cursor Settings`, click `MCP`, and make sure `extend-sdk-mcp-server` is enabled.

### Sample prompts

In Cursor, press `CTRL+L` and try the following prompts. You should see that the tools provided by this MCP server are used. Give permission to execute the tools when requested.

- Search functions: `Search for functions related to 'user'`
- Get function details: `Describe the 'AdminCreateUser@iam' function`
- Get model details: `Describe the 'User@iam' models`

## Environment Variables

- `TRANSPORT`: The MCP server transport (valid values: `stdio`, `streamableHttp`, default: `stdio`)
- `PORT`: HTTP server port if `TRANSPORT` is `streamableHttp` (default: `3000`)
- `CONFIG_DIR`: Directory of YAML config files (recursive, default: `config/go`)
  - For Extend SDK C#: `config/csharp`
  - For Extend SDK Go: `config/go`
  - For Extend SDK Java (coming soon): `config/java`
  - For Extend SDK Python: `config/python`
- `NODE_ENV`: Environment (valid values: `development`, `production`)
- `LOG_LEVEL`: Logging level (valid values: `debug`, `info`, `warn`, `error`)

## Development

### Prerequisites

- Bash
- Curl
- Docker
- Makefile
- Node.js 18+ 
- pnpm

### Install dependencies

```bash
pnpm install
```

### Start the MCP server for development

#### With the default STDIO transport

```bash
pnpm dev
```

#### With streamable HTTP transport

```bash
TRANSPORT=streamableHttp pnpm dev 
```

### Build the MCP server

```bash
pnpm build
```

### Start the MCP server after build

#### With the default STDIO transport

```bash
pnpm start
```

#### With streamable HTTP transport 

```bash
TRANSPORT=streamableHttp pnpm start
```
## Testing

1. Start the MCP server with streamable HTTP transport.

2. Initialize the MCP connection.

    ```bash
    curl -N -H "Accept: application/json, text/event-stream" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
        http://localhost:3000/
    ```

3. List available tools.

    ```bash
    curl -N -H "Accept: application/json, text/event-stream" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
        http://localhost:3000/
    ```

4. Test the search tool.

    ```bash
    curl -N -H "Accept: application/json, text/event-stream" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_functions","arguments":{"query":"user"}}}' \
        http://localhost:3000/
    ```

5. Test describe model.

    ```bash
    curl -N -H "Accept: application/json, text/event-stream" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"describe_model","arguments":{"id":"User@iam"}}}' \
        http://localhost:3000/
    ```