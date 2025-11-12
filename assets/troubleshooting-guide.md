# AccelByte Extend: Troubleshooting Guide

## Common Issues and Solutions

### 1. Authentication Errors
**Symptoms**: `401 Unauthorized` errors occur

**Causes and Solutions**:
- `PLUGIN_GRPC_SERVER_AUTH_ENABLED` is set to `false` in production environment
  - Always set to `true` in production environments
- Invalid OAuth client credentials
  - Regenerate client credentials in Admin Portal
- Expired access tokens
  - Implement token refresh logic

### 2. Out of Memory Errors
**Symptoms**: Container gets `OOMKilled`

**Causes and Solutions**:
- Memory leaks or excessive memory usage
  - Monitor memory usage with Grafana
- Container memory limits too low
  - Adjust resource limits

### 3. Deployment Failures
**Symptoms**: Deployment stuck in `STOPPED` state

**Causes and Solutions**:
- Container image build errors
  - Check extend-helper-cli logs
- Missing required environment variables
  - Verify all required environment variables are set
- Health check failures
  - Test container locally

### 4. gRPC Connection Errors
**Symptoms**: Failed connections to gRPC server

**Causes and Solutions**:
- Port configuration mismatch
  - Verify port 6565 is correctly configured
- Firewall settings
  - Ensure required ports are open
- Authentication configuration issues
  - Disable authentication in development environment for testing

## Debug Commands

```bash
# Check Docker logs
docker compose logs -f extend-app

# gRPC server health check
grpcurl -plaintext localhost:6565 grpc.health.v1.Health/Check

# Verify environment variables
docker compose exec extend-app env | grep AB_

# Check ngrok tunnel status
curl http://localhost:4040/api/tunnels
```

## Performance Optimization

### High CPU Usage
- Review asynchronous processing implementation
- Consider introducing batch processing
- Configure connection pooling

### High Memory Usage
- Use memory profiling tools
- Verify unnecessary object cleanup
- Adjust cache sizes

### Slow Response Times
- Optimize database queries
- Implement caching strategies
- Introduce parallel processing
