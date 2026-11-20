# Build from the repository root: the workspace shares a single bun.lock.
#   docker build -f apps/fair-play-worker/Dockerfile -t typomaniac-fair-play-worker .
FROM oven/bun:1.4.4 AS build
WORKDIR /app

# Every workspace manifest is needed for `--frozen-lockfile` to match the root lockfile.
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/matchmaker/package.json ./apps/matchmaker/
COPY apps/fair-play-worker/package.json ./apps/fair-play-worker/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typing-engine/package.json ./packages/typing-engine/
COPY packages/duel-engine/package.json ./packages/duel-engine/
COPY packages/ranked-engine/package.json ./packages/ranked-engine/
COPY packages/fair-play/package.json ./packages/fair-play/
COPY packages/fair-play-engine/package.json ./packages/fair-play-engine/
COPY packages/matchmaking-engine/package.json ./packages/matchmaking-engine/
COPY packages/redis/package.json ./packages/redis/
COPY packages/db/package.json ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY packages/queue/package.json ./packages/queue/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile --filter fair-play-worker

# The workspace packages the worker imports are compiled from their sources: each one must be copied whole.
COPY packages/typing-engine ./packages/typing-engine
COPY packages/duel-engine ./packages/duel-engine
COPY packages/ranked-engine ./packages/ranked-engine
COPY packages/fair-play ./packages/fair-play
COPY packages/fair-play-engine ./packages/fair-play-engine
COPY packages/db ./packages/db
COPY packages/logger ./packages/logger
COPY apps/fair-play-worker ./apps/fair-play-worker
ENV NODE_ENV=production
RUN bun build --compile --minify-whitespace --minify-syntax --target bun --outfile fair-play-worker apps/fair-play-worker/src/index.ts

FROM gcr.io/distroless/base
WORKDIR /app
COPY --from=build /app/fair-play-worker ./fair-play-worker
ENV NODE_ENV=production
# The worker refuses to start without DATABASE_URL (compose.prod.yaml sets it) and never migrates:
# the API does. It listens on no port.
CMD ["./fair-play-worker"]
