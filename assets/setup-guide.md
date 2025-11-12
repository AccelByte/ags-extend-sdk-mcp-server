# AccelByte Extend: Setup Guide

## Prerequisites

- Docker Desktop 4.30+ / Docker Engine 23+
- Go 1.18+ (templates may vary; this MCP server uses Go 1.23+)
- make, git, bash
- Optional: Postman / grpcurl for gRPC testing

## Environment Variables (local)

```
AB_BASE_URL=https://test.accelbyte.io
AB_CLIENT_ID=your-client-id
AB_CLIENT_SECRET=your-client-secret
AB_NAMESPACE=your-namespace
PLUGIN_GRPC_SERVER_AUTH_ENABLED=false  # local dev only
```

## Local Tools

- extend-helper-cli: deploy/build helpers
- ngrok/pinggy: tunneling for local callbacks

## Project Bootstrap

1. Clone an official Extend template
2. Run `make proto` if proto is provided
3. Implement your handlers/services
4. `docker compose up --build`

## gRPC Quick Checks

- Health: `grpcurl -plaintext localhost:6565 grpc.health.v1.Health/Check`
- Logs: `docker compose logs -f`
