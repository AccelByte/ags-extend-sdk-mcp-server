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
# Build the Docker image
docker build -t extend-sdk-mcp-server .

# Or with a specific tag
docker build -t extend-sdk-mcp-server:latest .
```

### Running the Docker Container

```bash
# Run the container (basic)
docker run -p 3000:3000 extend-sdk-mcp-server

# Run with environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e LOG_LEVEL=info \
  extend-sdk-mcp-server

# Run in detached mode
docker run -d -p 3000:3000 --name extend-mcp extend-sdk-mcp-server

# View logs
docker logs -f extend-mcp

# Stop the container
docker stop extend-mcp
```

### Docker Compose (Optional)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  extend-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d
```

## Testing the MCP Server

### Method 1: Using MCP Inspector (Recommended)

The easiest way to test your MCP server is using the official MCP Inspector:

```bash
# Install and run MCP Inspector
npx @modelcontextprotocol/inspector node dist/adapter-http.js
```

This will:
- Start your MCP server
- Open a web interface in your browser
- Allow you to interactively test all available tools
- Show real-time responses and logs

### Method 2: Using curl (Advanced)

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

### Method 3: Using Claude Desktop

1. Copy the provided `claude_desktop_config.json` to your Claude Desktop configuration directory
2. Restart Claude Desktop
3. The MCP server will be available as tools in Claude

### Method 4: Using MCP Server Tester (Automated)

For comprehensive automated testing:

```bash
# Clone the MCP Server Tester
git clone https://github.com/r-huijts/mcp-server-tester.git
cd mcp-server-tester
npm install
npm run build

# Create a config file (mcp-servers.json)
cat > mcp-servers.json << EOF
{
  "servers": [
    {
      "name": "extend-sdk-mcp-server",
      "command": "node",
      "args": ["/path/to/your/dist/adapter-http.js"],
      "env": {"PORT": "3000"}
    }
  ]
}
EOF

# Run tests
npm run test
```

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

## Development

### Project Structure
```
src/
├── adapter-http.ts      # HTTP MCP server implementation
├── adapter-stdio.ts     # STDIO MCP server (alternative)
├── tools.ts            # Core tool handlers
├── registry.ts         # Command registry
├── commands/           # Command definitions
│   ├── *.yaml         # Command catalogs by language
│   └── commands.yaml  # Main command registry
└── ...
```

### Adding New Commands

1. Create a new file under `src/commands/yourNs.ts`
2. Export a `register(reg)` function
3. Call `reg.register({ ns, name, schema, summary, examples, run })` for each command
4. For large catalogs, implement lazy loading in `registry.ts`

### Building for Production

```bash
# Build TypeScript
pnpm run build

# The built files will be in dist/
```

## Troubleshooting

### Common Issues

**"Not Acceptable: Client must accept both application/json and text/event-stream"**
- Solution: Add the correct Accept header: `-H "Accept: application/json, text/event-stream"`

**"Method not allowed"**
- Solution: Use POST requests for MCP tool calls, not GET

**Connection refused**
- Solution: Ensure the server is running on the correct port (default: 3000)

**JSON-RPC errors**
- Solution: Ensure your request follows JSON-RPC 2.0 format with proper `jsonrpc`, `id`, `method`, and `params` fields

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
