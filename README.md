# Extend SDK MCP Server

This project provides a **Model Context Protocol (MCP) server** that exposes SDK commands through a scalable pattern using only three MCP tools. It allows AI assistants and other MCP clients to discover, describe, and execute thousands of SDK commands dynamically.

## What is this project?

This is an MCP server that provides access to SDK functionality through the Model Context Protocol. Instead of exposing thousands of individual tools (which would be slow and unwieldy), it uses a smart dispatch pattern with just three tools:

- **`dispatch_search`** – Discover commands by text search or namespace
- **`dispatch_describe`** – Get detailed JSON Schema and examples for any command
- **`dispatch_run`** – Execute any command with proper parameters

### Why this pattern?
- **Fast handshake**: Keeps the MCP tool list tiny for quick client connections
- **Lazy loading**: Command catalogs are loaded by namespace on demand
- **LLM-friendly**: Provides enough structure for AI assistants to pick the right commands
- **Scalable**: Can handle thousands of commands without performance issues

## Architecture

The server is built using:
- **MCP SDK**: Official Anthropic MCP SDK with HTTP transport
- **Server-Sent Events (SSE)**: For real-time streaming responses
- **JSON-RPC 2.0**: Standard protocol for MCP communication
- **TypeScript**: Full type safety with Zod schemas
- **Docker**: Containerized deployment ready

## Quick Start (Development)

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Local Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
# Server listens at http://localhost:3000
```

## Docker Setup

### Building the Docker Image

```bash
# Build the Docker image with a specific tag
docker build -t extend-sdk-mcp-server:latest .
```

### Running the Docker Container

```bash
# Run with environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e LOG_LEVEL=info \
  extend-sdk-mcp-server

## Testing the MCP Server

The MCP server uses JSON-RPC 2.0 over Server-Sent Events. Here's the complete testing sequence:

#### Prerequisites
- Server must be running on `http://localhost:3000`
- Use the correct Accept headers: `application/json, text/event-stream`

#### Complete MCP Testing Sequence

**1. Initialize the MCP connection:**
```bash
curl -N -H "Accept: application/json, text/event-stream" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
     http://localhost:3000/
```

**2. List available tools:**
```bash
curl -N -H "Accept: application/json, text/event-stream" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
     http://localhost:3000/
```

**3. Test the search tool:**
```bash
curl -N -H "Accept: application/json, text/event-stream" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"dispatch_search","arguments":{"q":"hello"}}}' \
     http://localhost:3000/
```

**4. Test the describe tool:**
```bash
curl -N -H "Accept: application/json, text/event-stream" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"dispatch_describe","arguments":{"ns":"demo","name":"hello"}}}' \
     http://localhost:3000/
```

**5. Test the run tool:**
```bash
curl -N -H "Accept: application/json, text/event-stream" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"dispatch_run","arguments":{"ns":"demo","name":"hello","args":{"name":"World"}}}}' \
     http://localhost:3000/
```

#### Key curl Parameters Explained

- **`-N`**: Disables buffering to handle streaming responses properly
- **`Accept: application/json, text/event-stream`**: Required for MCP servers (both types needed)
- **`Content-Type: application/json`**: Required for POST requests
- **JSON-RPC 2.0 format**: All requests must follow this specification

## Available MCP Tools

The server exposes these 3 tools:

### 1. `dispatch_search`
Search for available commands by text or namespace.

**Parameters:**
- `q` (optional): Search query string
- `ns` (optional): Namespace filter
- `limit` (optional): Maximum results (1-200, default: 25)
- `offset` (optional): Pagination offset (default: 0)

### 2. `dispatch_describe`
Get detailed information about a specific command.

**Parameters:**
- `ns` (required): Command namespace
- `name` (required): Command name

**Returns:** JSON Schema, examples, and summary for the command.

### 3. `dispatch_run`
Execute a specific command.

**Parameters:**
- `ns` (required): Command namespace
- `name` (required): Command name
- `args` (optional): Command arguments object

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
