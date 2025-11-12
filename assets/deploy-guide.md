# AccelByte Extend: Deploy

## Build & Package

- Ensure Dockerfile is production-ready (minimal base, healthcheck)
- Build locally and verify:

```
docker build -t your-repo/extend-app:dev .
docker run --rm -p 6565:6565 your-repo/extend-app:dev
```

## Pre-deploy Checklist

- Required env vars set (client ID/secret, namespace)
- Health endpoint verified (gRPC health or custom)
- Resource limits defined (CPU/Memory)

## Deploy with extend-helper-cli

1. Login to your AccelByte environment
2. Push the image to your registry
3. Create/Update the Extend app deployment in Admin Portal or via CLI

## Troubleshooting

- Check app logs from portal or `kubectl logs`
- Confirm network policies/firewalls for egress/ingress
- Validate OAuth scopes and client credentials
