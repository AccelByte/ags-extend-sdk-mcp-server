# Use the latest stable Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose port (adjust if your app uses a different port)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Set default commands file path (can be overridden via environment variable)
# Users can override this by setting COMMANDS_FILE environment variable when running the container
# Examples:
#   docker run -e COMMANDS_FILE=custom-commands.yaml <image>  # Just filename
#   docker run -e COMMANDS_FILE=/app/dist/commands/custom-commands.yaml <image>  # Full path
ENV COMMANDS_FILE=commands.yaml

# Copy entrypoint script for proper signal handling and environment variable processing
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Use the entrypoint script to ensure proper signal handling
ENTRYPOINT ["/app/entrypoint.sh"]
