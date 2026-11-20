# typomaniac_v2

Turborepo monorepo on Bun.

## Apps

- `api`: HTTP and WebSocket backend
- `frontend`: web client
- `matchmaker`: worker with no HTTP and no WebSocket; one leader at a time, held by a Redis lock
- `fair-play-worker`: worker with no HTTP and no WebSocket that runs the fair-play pass; one leader at a time, held by a lease in Postgres; never migrates the database

## Packages

- `@repo/ui`: React component library
- `@repo/redis`: opening Redis, shared by `api` and `matchmaker`
- `@repo/db`: the database schema and its opening, shared by `api` and the fair-play worker
- `@repo/fair-play`: the fair-play pass and the steps that apply a Sanction, shared by `api` and the fair-play worker
- `@repo/typescript-config`: shared `tsconfig`s

## Quality

All commands run from the root:

```sh
bun run lint       # oxlint
bun run fmt        # oxfmt (writes files)
bun run fmt:check  # oxfmt, without writing
bun run typecheck  # bun check -b
```

The reasons for these choices are in [docs/adr/0001](docs/adr/0001-oxc-and-bun-check-quality-toolchain.md).
