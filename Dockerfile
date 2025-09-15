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

# Start the application with configurable commands file
# The COMMANDS_FILE environment variable allows users to select different command YAML files
# from the dist/commands directory. Users can specify just the filename or a full path.
CMD ["sh", "-c", "if [ \"${COMMANDS_FILE#/}\" = \"${COMMANDS_FILE}\" ]; then COMMANDS_FILE=\"/app/dist/commands/${COMMANDS_FILE}\"; fi && node dist/adapter-http.js --commands-file ${COMMANDS_FILE}"]
