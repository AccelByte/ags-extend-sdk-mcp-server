# Changelog

## v2025.8.1

### Major Refactoring

This release includes a comprehensive architectural refactoring to improve code organization, maintainability, and extensibility.

#### Architecture Changes

* **Modular Server Architecture**: Refactored server implementation into a modular structure:
  * Introduced `BaseServer` abstract class with unified tool management and extensibility pattern
  * Separated transport implementations into `StdioServer` and `StreamableHttpServer` classes
  * Implemented `modify()` pattern for registering tools, resources, and prompts

* **Session Management**: Added comprehensive session management system:
  * New `SessionManager` class for managing multiple concurrent sessions
  * Support for session lifecycle (create, get, delete, clear)
  * Default session support for backward compatibility
  * Session-aware tool execution with context passing

* **Code Organization**: Improved project structure:
  * Moved server implementations to `src/server/` directory
  * Organized tools into `src/tools/symbols/` directory
  * Added resources system in `src/resources/` directory
  * Added prompts system in `src/prompts/` directory
  * Separated session management into `src/session/` directory

#### New Features

* **Resources System**: Added resource registration system for exposing static content:
  * Resource registration via `registerResources()` function
  * Support for multiple resource types with MIME type handling
  * Resource URI generation and content retrieval

* **Prompts System**: Added prompt template system:
  * `create-extend-app` prompt for generating Extend app creation workflows
  * Support for repository-based prompts with autocomplete
  * Scenario, template, language, and repository selection with validation

* **Enhanced Symbol Tools**: Improved symbol search and description tools:
  * Better fuzzy matching using Levenshtein distance algorithm
  * Unified symbol scoring system (replaces separate function/struct scoring)
  * Improved search term parsing and validation
  * Enhanced pagination with validation

#### Code Quality Improvements

* **Linting and Formatting**: Added code quality tools:
  * ESLint configuration with Airbnb base rules and TypeScript support
  * Prettier configuration for consistent code formatting
  * Updated TypeScript configuration with improved module resolution (`NodeNext`)
  * Added source maps and declaration maps for better debugging

* **Type Safety**: Enhanced type safety throughout:
  * Comprehensive Zod schemas for validation
  * Improved TypeScript configuration with stricter settings
  * Better type inference and error handling

* **Configuration**: Improved configuration management:
  * Centralized configuration in `src/config.ts` with Zod validation
  * Support for multiple environment variable names (e.g., `MCP_TRANSPORT` or `TRANSPORT`)
  * Better default values and validation

#### Functionality Migration

* **Helpers Migration**: All functionality from `src/helpers.ts` has been migrated and improved:
  * `parseSearchQuery` → `parseSearchTerms` (improved parsing logic)
  * `fuzzyMatch` → `fuzzyMatch` (enhanced with Levenshtein distance algorithm)
  * `calculateFunctionMatchScore` + `calculateStructMatchScore` → `calculateSymbolMatchScore` (unified, more flexible)
  * `paginateResults` → `paginateSymbols` (same functionality, better naming)

#### HTTP Server Enhancements

* **Security**: Enhanced HTTP server security:
  * Helmet.js integration for security headers
  * CORS support with configurable allowed origins
  * Rate limiting (100 requests per 15 minutes)
  * Request size limits (10MB)

* **Session Handling**: Improved HTTP session management:
  * Session ID generation and tracking
  * Transport caching per session
  * Proper session cleanup on disconnect

#### Dependencies

* Updated dependencies for improved functionality and security
* Added new dependencies: `cors`, `express-rate-limit`, `helmet`, `zod`
* Updated MCP SDK to latest version

#### Breaking Changes

* **Transport Environment Variable**: The `TRANSPORT` environment variable now accepts `http` instead of `streamableHttp` (though `streamableHttp` is still accepted for backward compatibility)
* **Module System**: Changed from `ES2022`/`Bundler` to `NodeNext` module resolution
* **File Structure**: Several files have been moved or renamed - see architecture changes above

## v2025.8.0

* Updated config files.

## v2025.7.0

### Initial Release

This is the initial release of the Extend SDK MCP Server, providing Model Context Protocol integration for AccelByte Extend SDK.

#### Core Features

* **MCP Server Implementation**: Full Model Context Protocol server implementation with tool support
* **Transport Support**: 
  * STDIO transport (default) for local development and integration
  * Streamable HTTP transport for remote server deployments
* **Docker Support**: Containerized deployment with Dockerfile and entrypoint script

#### Tools

The following MCP tools are available for searching and describing Extend SDK symbols:

* **`search_functions`** – Search for functions by name, tags, or description with fuzzy matching support
* **`search_models`** – Search for models by name, tags, or description with fuzzy matching support
* **`describe_function`** – Get detailed information about a specific function by its ID
* **`describe_model`** – Get detailed information about a specific model by its ID
* **`get_bulk_functions`** – Retrieve multiple functions with pagination (experimental)
* **`get_bulk_models`** – Retrieve multiple models with pagination (experimental)

#### Extend SDK Support

* **Multi-Language Support**: Configuration files for all Extend SDK languages:
  * Go Extend SDK (default)
  * Python Extend SDK
  * C# Extend SDK
  * Java Extend SDK
* **Symbol Definitions**: Comprehensive YAML configuration files containing function and model definitions for all Extend SDK services:
  * Achievement, AMS, Basic, Challenge, Chat, CloudSave, CSM
  * GameTelemetry, GDPR, Group, IAM, Inventory, Leaderboard, Legal
  * Lobby, LoginQueue, Match2, Platform, Reporting, SeasonPass
  * Session, SessionHistory, Social, UGC

#### Configuration

* **Environment Variables**:
  * `TRANSPORT`: Transport type (`stdio` or `streamableHttp`, default: `stdio`)
  * `PORT`: HTTP server port for streamable HTTP transport (default: `3000`)
  * `CONFIG_DIR`: Directory containing YAML config files (default: `config/go`)
  * `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`, default: `info`)
  * `NODE_ENV`: Environment mode (`development` or `production`)

#### Development & CI/CD

* **CI/CD Pipelines**: 
  * Jenkins pipeline for automated builds and deployments
  * GitHub Actions workflow for container image publishing to GHCR
* **Documentation**: Comprehensive README with setup instructions for Cursor and other MCP clients
* **Development Tools**: TypeScript project with build scripts and development workflow
