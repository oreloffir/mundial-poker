FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace config + lockfile first (cache layer)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/tsconfig.json apps/server/
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/

# Install all deps (including dev for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

# Build shared first, then server
RUN pnpm --filter @wpc/shared build
RUN pnpm --filter server build

# --- Production image ---
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace config for prod install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=builder /app/apps/server/dist/ apps/server/dist/
COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/

EXPOSE 5174
ENV NODE_ENV=production
ENV PORT=5174

CMD ["node", "apps/server/dist/apps/server/src/app.js"]
