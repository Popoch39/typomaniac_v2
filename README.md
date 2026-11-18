# typomaniac_v2

Turborepo monorepo on Bun.

## Packages

- `@repo/ui`: React component library
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
