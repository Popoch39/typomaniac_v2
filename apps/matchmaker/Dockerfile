# Build from the repository root: the workspace shares a single bun.lock.
#   docker build -f apps/matchmaker/Dockerfile -t typomaniac-matchmaker .
FROM oven/bun:1.4.4 AS build
WORKDIR /app

# Every workspace manifest is needed for `--frozen-lockfile` to match the root lockfile.
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/matchmaker/package.json ./apps/matchmaker/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typing-engine/package.json ./packages/typing-engine/
COPY packages/duel-engine/package.json ./packages/duel-engine/
COPY packages/ranked-engine/package.json ./packages/ranked-engine/
COPY packages/matchmaking-engine/package.json ./packages/matchmaking-engine/
COPY packages/redis/package.json ./packages/redis/
COPY packages/logger/package.json ./packages/logger/
COPY packages/queue/package.json ./packages/queue/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile --filter matchmaker

# The workspace packages the matchmaker imports are compiled from their sources: each one must be copied whole.
COPY packages/matchmaking-engine ./packages/matchmaking-engine
COPY packages/redis ./packages/redis
COPY packages/logger ./packages/logger
COPY packages/queue ./packages/queue
COPY apps/matchmaker ./apps/matchmaker
ENV NODE_ENV=production
RUN bun build --compile --minify-whitespace --minify-syntax --target bun --outfile matchmaker apps/matchmaker/src/index.ts

FROM gcr.io/distroless/base
WORKDIR /app
COPY --from=build /app/matchmaker ./matchmaker
ENV NODE_ENV=production
# The matchmaker refuses to start without REDIS_URL (compose.prod.yaml sets it). It listens on no port.
CMD ["./matchmaker"]
