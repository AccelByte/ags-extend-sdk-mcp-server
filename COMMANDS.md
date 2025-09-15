# YAML-Driven Command Registration System

This MCP server now uses a data-driven approach for registering commands, making it easy to add new commands without modifying TypeScript code.

## How It Works

### Handler Priority Order

The system processes commands in this priority order:

1. **📋 Static Data** (Highest Priority) - Returns predefined content immediately
2. **🔄 Named Handler** - Executes TypeScript function from `registry-yaml.ts`
3. **⚡ Inline Handler** - Executes JavaScript code defined in YAML
4. **❌ Error** - If no handler is found

### 1. Command Definition (YAML)

Commands are defined in `src/commands/commands.yaml`:

```yaml
ns: demo
name: hello
summary: Say hello (optionally, to a specific name)
schema:
  type: object
  properties:
    name:
      type: string
      description: Name to greet
  additionalProperties: false
examples:
  - args: {}
    comment: generic greeting
  - args:
      name: World
    comment: personalized greeting
handler: hello
```

### 2. Handler Implementation (TypeScript)

Handlers are implemented in `src/registry-yaml.ts`:

```typescript
const handlers = {
  hello: async (cmd: any, args: any) => {
    const who = args?.name ?? "there";
    return { 
      message: `Hello, ${who}!`,
      command: `${cmd.ns}/${cmd.name}`,
      summary: cmd.summary
    };
  },
  // ... more handlers
};
```

### 3. Automatic Registration

The system automatically:
- Loads commands from YAML
- Maps handlers to command definitions
- Registers everything with the MCP server

## Adding New Commands

### Method 1: Named Handler (Recommended for Complex Logic)

**Step 1: Add to YAML**
```yaml
ns: math
name: multiply
summary: Multiply two numbers
schema:
  type: object
  properties:
    a:
      type: number
    b:
      type: number
  required:
    - a
    - b
examples:
  - args:
      a: 4
      b: 5
    comment: 4 × 5 = 20
handler: multiply
```

**Step 2: Add Handler**
```typescript
const handlers = {
  // ... existing handlers
  multiply: async (cmd: any, args: any) => {
    const { a, b } = args;
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Both a and b must be numbers');
    }
    return { 
      result: a * b, 
      operation: `${a} × ${b}`,
      command: `${cmd.ns}/${cmd.name}`,
      summary: cmd.summary
    };
  }
};
```

**Step 3: Rebuild**
```bash
pnpm build
```

### Method 2: Inline Handler (Great for Simple Functions)

**Add directly to YAML:**
```yaml
ns: math
name: square
summary: Square a number
schema:
  type: object
  properties:
    x:
      type: number
  required:
    - x
examples:
  - args:
      x: 5
    comment: 5² = 25
handlerInline: |
  return { 
    result: args.x * args.x, 
    operation: `${args.x}²`,
    command: `${cmd.ns}/${cmd.name}`,
    summary: cmd.summary
  };
```

**No TypeScript changes needed!** Just rebuild:
```bash
pnpm build
```

### Method 3: Static Data (Perfect for Fixed Content)

**Add directly to YAML:**
```yaml
ns: info
name: version
summary: Get server version information
schema:
  type: object
  properties: {}
examples:
  - args: {}
staticData:
  version: "0.1.0"
  name: "accelbyte-jssdk-mcp"
  description: "MCP server for AccelByte JavaScript SDK"
  features:
    - "JSON Schema validation"
    - "Inline handlers"
    - "Static data support"
```

**No code needed at all!** Just rebuild:
```bash
pnpm build
```

### When to Use Each Method:

- **📋 Static Data**: Fixed content, configuration info, help text, documentation
- **🔄 Named Handler**: Complex logic, reusable functions, error handling
- **⚡ Inline Handler**: Simple operations, quick prototypes, one-off functions

## Current Commands

| Namespace | Command | Description | Handler Type |
|-----------|---------|-------------|--------------|
| `demo` | `hello` | Say hello (optionally to a name) | Named |
| `system` | `time` | Get server time in ISO format | Named |
| `math` | `add` | Add two numbers together | Named |
| `utils` | `uuid` | Generate a random UUID | Named |
| `math` | `square` | Square a number | Inline |
| `utils` | `echo` | Echo back input with timestamp | Inline |
| `math` | `random` | Generate random number in range | Inline |
| `info` | `version` | Get server version information | Static Data |
| `info` | `help` | Get help information about available commands | Static Data |

## Benefits

- **🚀 Rapid Development**: Add commands without touching TypeScript
- **📝 Clear Documentation**: JSON structure documents command behavior
- **🔧 Easy Maintenance**: Centralized command definitions
- **📊 Schema Validation**: Built-in JSON schema support
- **🎯 Consistent Structure**: All commands follow the same pattern

## Schema Validation

Each command can include a JSON schema that defines:
- Required parameters
- Parameter types
- Parameter descriptions
- Validation rules

## Examples

Each command can include usage examples that show:
- Sample arguments
- Expected behavior
- Common use cases

## Error Handling

Handlers can throw errors that will be:
- Logged with structured logging
- Returned to the MCP client
- Properly formatted as JSON-RPC errors

## Static Data

Static data commands return predefined content without any processing. Perfect for:

- **📋 Configuration information** (version, settings, capabilities)
- **📚 Help and documentation** (command lists, usage examples)
- **🔧 System information** (status, features, metadata)
- **📝 Fixed responses** (welcome messages, error descriptions)

The `staticData` field can contain any valid YAML data structure that will be returned directly.

## Inline Handler Syntax

Inline handlers use JavaScript code as strings. The function has access to:

- **`cmd`**: The command definition object (namespace, name, summary, schema, examples)
- **`args`**: The command arguments object
- **`ctx`**: Context object with `signal` (AbortSignal)

### Examples:

**Simple return:**
```yaml
handlerInline: "return { message: 'Hello World' };"
```

**With arguments:**
```yaml
handlerInline: "return { result: args.x + args.y, sum: true };"
```

**Using command metadata:**
```yaml
handlerInline: |
  return { 
    result: args.x * args.x,
    command: `${cmd.ns}/${cmd.name}`,
    summary: cmd.summary
  };
```

**Complex logic:**
```yaml
handlerInline: |
  const result = args.numbers.reduce((a, b) => a + b, 0);
  return { sum: result, count: args.numbers.length };

```

**Error handling:**
```yaml
handlerInline: |
  if (!args.name) {
    throw new Error('Name is required');
  }
  return { greeting: `Hello, ${args.name}!` };
```

### Security Note:
Inline handlers execute JavaScript code, so ensure the YAML file is secure and not user-editable in production environments.

## Build Process

The build process (`pnpm build`) automatically:
- Compiles TypeScript to JavaScript
- Copies the `commands.yaml` file to the `dist/commands/` directory
- Ensures all commands are available when the server runs

**Important:** If you modify `commands.yaml`, you must rebuild the project for changes to take effect.
