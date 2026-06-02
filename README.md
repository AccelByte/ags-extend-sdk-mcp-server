# AGS Extend SDK MCP Server

A Model Context Protocol (MCP) server that gives AI assistants (VS Code Copilot, Cursor, Claude, Gemini, Antigravity) the AccelByte Extend SDK as additional context — so they can answer questions about the SDK and generate correct Extend SDK code.

## What It Does

- **Search** Extend SDK symbols (functions and models) by name, tags, or description (fuzzy matching)
- **Describe** specific symbols — parameters, fields, imports, examples, return types, required permissions
- **Scaffold** a new Extend app from a template repository via the `create-extend-app` prompt

It serves SDK reference for **four languages — C#, Go, Java, and Python**. You pick the language per connection through the URL path (see [Choose your language](#step-1-choose-your-language-and-get-your-url)).

AccelByte hosts the Extend SDK MCP Server for you — **you don't need to install or run anything locally**. Just point your AI assistant at the hosted MCP URL for your language. There's **no sign-in**: the server only exposes read-only SDK reference data. Prefer to run it yourself? See [Running Locally & Self-Hosting](docs/LOCAL.md).

---

## Quick Install

Paste this into your AI coding assistant — it will fetch the install guide, ask you a couple of questions, and configure everything for you:

```
Install the AGS Extend SDK MCP server for me. Fetch and follow the instructions at
https://raw.githubusercontent.com/AccelByte/ags-extend-sdk-mcp-server/refs/heads/master/INSTALL.md
```

Works in **VS Code Copilot**, **Cursor**, **Claude Code**, **Antigravity**, and **Gemini CLI**.

> **Claude Desktop users:** The simplest path is **Settings → Connectors → Add custom connector** (Name: `extend-sdk`, URL: your MCP URL) — no AI installer needed. See [Claude Desktop](#claude-desktop) below.
>
> If you want to use the Quick Install prompt above, switch to the **Code** tab first (Chat and Cowork can't edit your config file).
>
> ![Claude Desktop — Code tab](docs/images/claude-desktop-code.png)

Prefer to do it yourself? See [Manual Install](#manual-install) below.

---

## Manual Install

### Step 1: Choose your language and get your URL

The MCP URL is the hosted server's base URL followed by `/extend-mcp/{language}`:

```
https://<mcp-server-host>/extend-mcp/{language}
```

| Language | URL path |
|---|---|
| C# | `/extend-mcp/csharp` |
| Go | `/extend-mcp/go` |
| Java | `/extend-mcp/java` |
| Python | `/extend-mcp/python` |

- `<mcp-server-host>` is the host of your organization's deployment — ask your AccelByte administrator if you're not sure.
- One hosted instance serves every language. To switch language later, just change the trailing path segment (e.g. `/extend-mcp/python` → `/extend-mcp/go`). Requesting an unknown language returns HTTP `400`.
- The base path (`/extend-mcp`) with no language serves the server's configured default language.

> **No hosted instance?** You can run the server yourself with Docker — see [Running Locally & Self-Hosting](docs/LOCAL.md).

### Step 2: Configure your client

The server uses **Streamable HTTP** transport. Clients that support HTTP transport connect to the URL directly. Clients that only support **stdio** transport use [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) as a bridge.

> **Need `mcp-remote`?** It runs via `npx`, so you need **Node.js 18+ with `npx` available** — verify with `npx --version`. No global install required.

Substitute your URL from Step 1 wherever you see `<URL>` below.

#### Visual Studio Code (Copilot)

`.vscode/mcp.json` in your workspace (or user `settings.json`):

```json
{
  "servers": {
    "extend-sdk": {
      "type": "http",
      "url": "<URL>"
    }
  }
}
```

If your client can't reach an HTTP server, swap to: `{ "command": "npx", "args": ["-y", "mcp-remote", "<URL>"] }`.

See the [VS Code MCP documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers).

#### Cursor

`.cursor/mcp.json` in your workspace (or user settings):

```json
{
  "mcpServers": {
    "extend-sdk": {
      "type": "http",
      "url": "<URL>"
    }
  }
}
```

If your client can't reach an HTTP server, swap to: `{ "command": "npx", "args": ["-y", "mcp-remote", "<URL>"] }`.

See the [Cursor MCP documentation](https://cursor.com/docs/context/mcp#using-mcpjson).

#### Claude Code

```bash
claude mcp add --transport http extend-sdk <URL>
```

Fallback (stdio-only environments): `claude mcp add extend-sdk -- npx -y mcp-remote <URL>`.

See the [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp#installing-mcp-servers).

#### Antigravity

`mcp_config.json` in your project root:

```json
{
  "mcpServers": {
    "extend-sdk": {
      "type": "http",
      "url": "<URL>"
    }
  }
}
```

If your client can't reach an HTTP server, swap to: `{ "command": "npx", "args": ["-y", "mcp-remote", "<URL>"] }`.

See the [Antigravity MCP documentation](https://antigravity.google/docs/mcp#connecting-custom-mcp-servers).

#### Gemini CLI

```bash
gemini mcp add --transport http extend-sdk <URL>
```

Fallback (stdio-only environments): `gemini mcp add extend-sdk -- npx -y mcp-remote <URL>`.

See the [Gemini CLI MCP documentation](https://geminicli.com/docs/tools/mcp-server/#configure-the-mcp-server-in-settingsjson).

#### Claude Desktop

**Option A — Custom Connector (recommended)**

1. Open **Settings → Connectors → Add custom connector** (under the "Customize" area).
2. Fill in **Name**: `extend-sdk` and **Remote MCP server URL**: your `<URL>` from Step 1.
3. Save.

> **Don't see "Add custom connector"?** Some Team and Enterprise plans disable custom connectors via workspace policy. If the option is missing or greyed out, use Option B.

**Option B — `mcp-remote` config file (fallback)**

Edit `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "extend-sdk": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "<URL>"]
    }
  }
}
```

Restart Claude Desktop after saving.

---

## Using the Tools

Once connected, your assistant has access to these tools. In your assistant's chat, try the example prompts below — give permission to run the tools when requested.

### `search-symbols`

Search Extend SDK symbols by name, tags, or description, with fuzzy matching. Returns a paginated list of summaries.

> *"Search for symbols related to user"* · *"Find symbols for inventory"*

### `describe-symbols`

Get full details for specific symbols by ID — fields, parameters, imports, example usage, return type, and required permissions.

> *"Describe the `AdminCreateUser@iam` and `User@iam` symbols"*

### `create-extend-app`

A prompt template that clones an Extend app template repository and opens it (in a Dev Container when available) so you can start from a working sample.

> Invoke the `create-extend-app` prompt and follow the scenario / template / language completions.

> [!TIP]
> When coding with this MCP server, start from an Extend SDK getting-started sample or an Extend app template instead of a blank project, and add relevant source files as context for better results.

---

## Running it yourself

Prefer to run the server locally (stdio) or host the HTTP server yourself? See **[Running Locally & Self-Hosting](docs/LOCAL.md)** for Docker usage, environment variables, HTTP endpoints, developing from source, and releasing the image.

---

## Troubleshooting

### Tool calls fail / the server returns `400`

Check the language in your URL path. It must be one of `csharp`, `go`, `java`, or `python` (e.g. `/extend-mcp/go`). An unknown language returns HTTP `400`.

### Client can't connect to the HTTP URL

Some clients only support stdio transport. Switch that client to the `mcp-remote` bridge config shown in [Step 2](#step-2-configure-your-client). It needs Node.js 18+ with `npx` available (`npx --version`).

### "Connection refused" or the host is unreachable

Confirm the `<mcp-server-host>` and full URL are correct (ask your AccelByte administrator), and that your network can reach it.

---

## Documentation

- [Installation Guide](INSTALL.md) — followed by the Quick Install prompt; readable on its own
- [Running Locally & Self-Hosting](docs/LOCAL.md) — Docker, environment variables, HTTP endpoints, development, and releasing the image

## Contributions

This repository is published as-is. For bug reports and questions, please open an issue.
