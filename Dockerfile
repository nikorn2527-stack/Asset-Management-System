# ──────────────────────────────────────────────
# Stage 1: Dependencies + Build
# ──────────────────────────────────────────────
FROM node:20-alpine AS base

# Install bun via official install script
RUN npm install -g bun@1

WORKDIR /app

# Copy dependency manifests first (better cache)
COPY package.json bun.lock* ./

# Install all dependencies (including dev for build)
RUN bun install --frozen-lockfile || bun install

# Copy source
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Create SQLite DB + push schema (Railway uses local SQLite)
ENV DATABASE_URL="file:./db/custom.db"
RUN mkdir -p db && bunx prisma db push --accept-data-loss 2>/dev/null || true

# Seed demo data
RUN bun run prisma/seed.ts

# Build Next.js (output: standalone is set in next.config.ts)
RUN bun run build

# ──────────────────────────────────────────────
# Stage 2: Production
# ──────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Set default DATABASE_URL for Railway
ENV DATABASE_URL="file:./db/custom.db"
ENV NODE_ENV="production"

# Copy standalone output (includes server.js, .next, node_modules, etc.)
COPY --from=base /app/.next/standalone ./

# Copy static assets
COPY --from=base /app/.next/static ./.next/static

# Copy public folder
COPY --from=base /app/public ./public

# Copy SQLite database file + ensure db dir exists
RUN mkdir -p db
COPY --from=base /app/db/custom.db ./db/custom.db

# Copy Prisma schema (needed by some edge cases)
COPY --from=base /app/prisma ./prisma

EXPOSE 3000

# Railway expects the app to bind to 0.0.0.0
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"

CMD ["node", "server.js"]