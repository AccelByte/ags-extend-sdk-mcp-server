# Installation Guide — AGS Extend SDK MCP Server

> **For AI coding assistants:** Follow the steps below to install the AGS Extend SDK MCP server for the user. Ask clarifying questions only when needed. Use the templates verbatim.
>
> **For humans:** You normally don't need to read this directly. Paste the [Quick Install prompt](README.md#quick-install) into your AI assistant and it will follow these instructions for you.

---

## Instructions for the AI Assistant

You are helping the user install the **AGS Extend SDK MCP server** into an AI coding assistant. Walk through the steps below in order. Be concise. Confirm critical inputs (the MCP URL) with the user before writing any files.

This server serves **read-only** Extend SDK reference data. There is **no authentication and no sign-in** — do not add OAuth, tokens, or login steps.

### Step 1 — Identify the host client

Detect which AI coding assistant you are running inside (or ask the user explicitly). Supported clients:

- Visual Studio Code (with GitHub Copilot)
- Cursor
- Claude Code (CLI)
- Claude Desktop (only via the **Code** tab — if the user is in the Chat or Cowork tab, instruct them to switch to **Code** before continuing)
- Antigravity
- Gemini CLI

If the user is using a client not in this list, tell them the server uses HTTP (Streamable HTTP) transport and link them to their client's MCP documentation.

### Step 2 — Determine the MCP server URL and language

The MCP URL has the form:

```
https://<mcp-server-host>/extend-mcp/{language}
```

Ask the user for two things:

1. **The host** (`<mcp-server-host>`) — the host of their organization's hosted deployment. If they don't know it, tell them to ask their AccelByte administrator. Do **not** guess the host.
2. **The Extend SDK language** — one of:

   | Language | Path segment |
   |---|---|
   | C# | `csharp` |
   | Go | `go` |
   | Java | `java` |
   | Python | `python` |

   If the user has a project already, infer the language from it and confirm. Otherwise ask.

Assemble the URL as `https://<host>/extend-mcp/<language>` (for example `https://development.accelbyte.io/extend-mcp/python`).

> If the user has no hosted instance, they can self-host with Docker — point them to [Running Locally & Self-Hosting](docs/LOCAL.md) instead of continuing here.

**Confirm the assembled URL with the user before continuing.** Show it back to them and ask "is this correct?"

### Step 3 — Choose transport mode

The deployed server uses **Streamable HTTP**. There are two ways to connect:

- **Native HTTP** — preferred; the client connects directly to the URL.
- **`mcp-remote` bridge** — required only for clients that don't support HTTP transport (stdio-only).

Use this decision table:

| Client | Default mode |
|---|---|
| Visual Studio Code | Native |
| Cursor | Native |
| Claude Code | Native |
| Claude Desktop | Native via the **Add custom connector** UI. Fall back to `mcp-remote` only if the user's account is on a Team/Enterprise plan that disables custom connectors via workspace policy. |
| Antigravity | Native |
| Gemini CLI | Native |

`mcp-remote` runs via `npx`. The user needs **Node.js 18 or newer with `npx` available**. Have them verify with `npx --version` before using it — if it fails, they need to install `npm` from their package manager or use the official Node installer at https://nodejs.org/.

### Step 4 — Write the configuration

Use the template matching the host client. Replace `<URL>` with the URL confirmed in Step 2.

#### Critical: Merge, do not overwrite

If the client's config file already has an `mcpServers` (or `servers`) object with other entries, merge the new `extend-sdk` entry into it. Overwriting will destroy the user's other MCP server configurations.

#### Visual Studio Code

**File:** `.vscode/mcp.json` in the workspace (preferred) or the user `settings.json`. Create the file with `{}` if it doesn't exist.

Native:
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

`mcp-remote` fallback:
```json
{
  "servers": {
    "extend-sdk": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "<URL>"]
    }
  }
}
```

#### Cursor

**File:** `.cursor/mcp.json` in the workspace (preferred) or the user settings file. Create with `{}` if missing.

Native:
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

`mcp-remote` fallback:
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

#### Claude Code

Prefer the CLI command over editing files:

Native:
```bash
claude mcp add --transport http extend-sdk <URL>
```

`mcp-remote` fallback:
```bash
claude mcp add extend-sdk -- npx -y mcp-remote <URL>
```

Or edit `.mcp.json` in the project root with the same schema as Cursor.

#### Claude Desktop

**Path A — Custom Connector (default)**

You cannot do this for the user — it's a manual UI action. Tell them to:

1. Open **Settings → Connectors → Add custom connector** (under the "Customize" area).
2. Set **Name** to `extend-sdk` and **Remote MCP server URL** to `<URL>`.
3. Save.

If the user reports that **Add custom connector** is missing or greyed out, their account is on a Team/Enterprise plan with custom connectors disabled by workspace policy. Switch to Path B.

**Path B — `mcp-remote` config file (fallback)**

**File:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Create with `{}` if it doesn't exist.

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

#### Antigravity

**File:** `mcp_config.json` in the project root.

Native:
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

`mcp-remote` fallback:
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

#### Gemini CLI

Prefer the CLI command:

Native:
```bash
gemini mcp add --transport http extend-sdk <URL>
```

`mcp-remote` fallback:
```bash
gemini mcp add extend-sdk -- npx -y mcp-remote <URL>
```

Or edit `~/.gemini/settings.json` (user) or `.gemini/settings.json` (project) with the same schema as Cursor.

### Step 5 — Tell the user to restart

Have the user fully quit and reopen the client (for VS Code / Cursor / Antigravity, reloading the window is enough; for Claude Desktop, fully quit and relaunch). No sign-in is required.

### Step 6 — Verify before handing off

Do not assume the install worked. While you are still in the conversation, ask the user to trigger a real tool call — the simplest is `search-symbols`, which is read-only (the user can prompt this with "Search for symbols related to user"). Then:

- If the call returns SDK symbols, the install is verified — proceed to Step 7.
- If the tools don't appear or the call errors, walk the user through the relevant fix from Step 7's recovery card *while you are still in the loop*. Common causes: client wasn't fully restarted, the client doesn't support HTTP transport (switch to the `mcp-remote` fallback), the config file wasn't saved, or the language path is wrong (must be `csharp` / `go` / `java` / `python`).
- If the user can't or won't test now, proceed to Step 7 and make the verification step explicit in the handoff card.

This is the only point where the user has live access to you. Use it.

### Step 7 — Hand off to the user

You are a one-shot installer — after this conversation ends, the user is on their own. Give them a self-contained recovery card they can keep.

#### Verbatim: Print the card below exactly

Use the template below as your final message. Fill in every `{placeholder}` with the actual value you used. Do not paraphrase or shorten the recovery steps.

````
✅ AGS Extend SDK MCP server installed.

**What I configured**
- Client: {client name, e.g. Cursor}
- MCP URL: {URL confirmed in Step 2}
- Language: {csharp | go | java | python}
- Transport: {native HTTP | mcp-remote bridge}
- Config location: {absolute file path, or "via `claude mcp add` CLI"}

**Try it now**
1. {Restart/reload instruction specific to this client}
2. Ask me (or any assistant): "Search for symbols related to user" — this calls the `search-symbols` tool.
3. You should get back a list of Extend SDK symbols. No sign-in is required.

**Save this card.** If something breaks later, use the steps below.

---

**If the tools don't show up**
Confirm the config at `{file path}` is saved and the client was fully restarted (not just reloaded).

**If the client can't connect to the URL**
Your client may not support HTTP transport. Edit `{file path}` and replace the `extend-sdk` entry with the `mcp-remote` fallback:
```json
"extend-sdk": {
  "command": "npx",
  "args": ["-y", "mcp-remote", "{URL}"]
}
```
This requires Node.js 18+ with `npx` available — check with `npx --version`. If `npx` is missing, install `npm` from your system package manager or grab the official Node installer at https://nodejs.org/. Restart the client after editing.

**If you want to switch SDK language**
Change the trailing path segment of the URL to `csharp`, `go`, `java`, or `python` (e.g. `{URL}` → the same URL ending in `/extend-mcp/go`), then restart the client.

**If tool calls return a `400` error**
The language in your URL path is not recognized. It must be one of `csharp`, `go`, `java`, or `python`.

**More help:** https://github.com/AccelByte/ags-extend-sdk-mcp-server#troubleshooting
````

After printing the card, stop. Do not add commentary unless the user asks a follow-up question.
