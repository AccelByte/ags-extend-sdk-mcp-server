# Use the latest stable Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Copy and set permissions for entrypoint script (after COPY . . to ensure it's not overwritten)
RUN sed -i "s/\r$//" /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Build the application
RUN pnpm run build

# Expose port (only used when TRANSPORT=http, adjust if your app uses a different port)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Use the entrypoint script to ensure proper signal handling
ENTRYPOINT ["/app/entrypoint.sh"]
