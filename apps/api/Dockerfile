# Build from the repository root: the workspace shares a single bun.lock.
#   docker build -f apps/api/Dockerfile -t typomaniac-api .
FROM oven/bun:1.4.4 AS build
WORKDIR /app

# Every workspace manifest is needed for `--frozen-lockfile` to match the root lockfile.
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile --filter api

COPY apps/api ./apps/api
ENV NODE_ENV=production
# No full `--minify`: it renames functions and breaks OpenTelemetry span names.
RUN bun build --compile --minify-whitespace --minify-syntax --target bun --outfile server apps/api/src/index.ts

FROM gcr.io/distroless/base
WORKDIR /app
COPY --from=build /app/server ./server
# Migrations are applied by the server at startup, read from ./drizzle relative to WORKDIR.
COPY --from=build /app/apps/api/drizzle ./drizzle
ENV NODE_ENV=production
# DATABASE_URL is required at runtime (see compose.prod.yaml).
EXPOSE 3000
CMD ["./server"]
