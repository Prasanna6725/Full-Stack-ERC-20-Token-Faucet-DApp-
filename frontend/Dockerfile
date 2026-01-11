# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (use npm install to avoid strict lockfile requirement)
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm install --no-audit --no-fund --production && \
  npm install --no-audit --no-fund express compression

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY server.js .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Set environment to production
ENV NODE_ENV=production

# Start application
CMD ["node", "server.js"]
