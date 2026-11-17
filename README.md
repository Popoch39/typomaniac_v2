# typomaniac_v2

Monorepo Turborepo sous Bun.

## Paquets

- `@repo/ui` : bibliothèque de composants React
- `@repo/typescript-config` : `tsconfig` partagés

## Qualité

Toutes les commandes se lancent depuis la racine :

```sh
bun run lint       # oxlint
bun run fmt        # oxfmt (écrit les fichiers)
bun run fmt:check  # oxfmt, sans écrire
bun run typecheck  # bun check -b
```

Les raisons de ces choix sont dans [docs/adr/0001](docs/adr/0001-oxc-and-bun-check-quality-toolchain.md).
