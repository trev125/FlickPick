# Build stage
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN pnpm install

# Copy source
COPY server ./server
COPY client ./client

# Build client
RUN pnpm --filter client build

# Build server
RUN pnpm --filter server build

# Production stage
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY server/package.json ./server/

# Install production dependencies only
RUN pnpm install --prod

# Copy built server
COPY --from=builder /app/server/dist ./server/dist

# Copy built client to serve statically
COPY --from=builder /app/client/dist ./client/dist

# Create data directory for persistent cache
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

CMD ["node", "server/dist/index.js"]
