# AGS Extend SDK MCP Server

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

> [!NOTE]
> The instructions below can be adapted for other MCP clients as well e.g. Claude Desktop, Gemini CLI, and Visual Studio Code.

### Alternative 1: Using STDIO transport (default)

1. Pull the AGS Extend SDK MCP Server container image. For example, with image tag 2025.7.0.

    ```bash
    docker pull ghcr.io/accelbyte/ags-extend-sdk-mcp-server:2025.7.0
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
            "ghcr.io/accelbyte/ags-extend-sdk-mcp-server:2025.7.0"
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

1. Pull the AGS Extend SDK MCP Server container image. For example, with image tag 2025.7.0.

    ```bash
    docker pull ghcr.io/accelbyte/ags-extend-sdk-mcp-server:2025.7.0
    ```

2. Start the MCP server with streamable HTTP transport.

    ```bash
    docker run -p 3000:3000 \
      -e TRANSPORT=streamableHttp \
      -e PORT=3000 \
      -e CONFIG_DIR=config/go \
      -e NODE_ENV=production \
      -e LOG_LEVEL=info \
      ghcr.io/accelbyte/ags-extend-sdk-mcp-server:2025.7.0
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

> [!IMPORTANT]
> Use the `ghcr.io/accelbyte/ags-extend-sdk-mcp-server` image tag that matches your AGS version. See the available image tags [here](https://github.com/accelbyte/ags-extend-sdk-mcp-server/pkgs/container/ags-extend-sdk-mcp-server/versions).

### Sample prompts

In Cursor, press `CTRL+L` and try the following prompts. You should see that the tools provided by this MCP server are used. Give permission to execute the tools when requested.

- Search functions: `Search for functions related to 'user'`
- Get function details: `Describe the 'AdminCreateUser@iam' function`
- Get model details: `Describe the 'User@iam' models`

[!TIP] When coding using this MCP server, we recommend to start from an Extend SDK getting started sample project or an Extend app template project instead of a blank project. Add the necessary context, such as specific source code files, to help getting better results. 

## Environment Variables

- `TRANSPORT`: The MCP server transport (valid values: `stdio`, `streamableHttp`, default: `stdio`)
- `PORT`: HTTP server port if `TRANSPORT` is `streamableHttp` (default: `3000`)
- `CONFIG_DIR`: Directory of YAML config files (recursive, default: `config/go`)
  - For Extend SDK C#: `config/csharp`
  - For Extend SDK Go: `config/go`
  - For Extend SDK Java: `config/java`
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

### Build the MCP server container image

```bash
docker build -t extend-sdk-mcp-server:latest .
```

## Release

### Push the MCP server container image to container registry

```bash
# Setup variables

GHCR_USERNAME=<your-username>
GHCR_PASSWORD=<your-password>
IMAGE_TAG=2025.7.0    # Matches AGS release, bump patch version for hotfix

# Prepare builder

docker buildx inspect extend-sdk-mcp-server-builder || docker buildx create --name extend-sdk-mcp-server-builder --use

# Login, build, and push multiarch image

docker login --username ${GHCR_USERNAME --password $GHCR_PASSWORD}
docker buildx build -t ghcr.io/accelbyte/ags-extend-sdk-mcp-server:${IMAGE_TAG} --platform linux/amd64,linux/arm64 --push .

# Clean up builder

docker buildx rm --keep-state extend-sdk-mcp-server-builder
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
  