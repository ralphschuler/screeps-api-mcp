# Multi-stage build for smaller production image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy source code first (needed for prepare script)
COPY . .

# Install dependencies including dev dependencies for building
RUN npm ci

# Build the project (prepare script runs build automatically, but let's be explicit)
RUN npm run build

# Remove dev dependencies to reduce size (clean install without dev deps)
RUN npm ci --omit=dev && npm cache clean --force

# Production stage
FROM node:20-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S screeps -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application and dependencies from builder
COPY --from=builder --chown=screeps:nodejs /app/dist ./dist
COPY --from=builder --chown=screeps:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=screeps:nodejs /app/package*.json ./

# Switch to non-root user
USER screeps

# Expose port (if needed for future web interface)
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Set default entrypoint
ENTRYPOINT ["node", "dist/index.js"]

# Default command (can be overridden)
CMD ["--help"]

# Labels for better metadata
LABEL org.opencontainers.image.title="screeps-api-mcp" \
      org.opencontainers.image.description="Model Context Protocol server for Screeps game API access" \
      org.opencontainers.image.url="https://github.com/ralphschuler/screeps-api-mcp" \
      org.opencontainers.image.source="https://github.com/ralphschuler/screeps-api-mcp" \
      org.opencontainers.image.vendor="Ralph Schuler" \
      org.opencontainers.image.licenses="MIT"