# Lint, format et typecheck : oxlint, oxfmt et bun check, à la racine

On remplace ESLint, Prettier et `tsc` par oxlint, oxfmt et `bun check`. Ce sont des outils natifs et rapides, qui fonctionnent sans paquet de config partagé. On les lance une seule fois depuis la racine, hors Turbo, car un passage global prend quelques millisecondes et le cache par paquet n'apporte rien.

## Considered Options

- **`bun lint` / `bun fmt`** : c'était le choix initial. Mais `bun lint` n'existe pas dans Bun 1.4.4 stable (seulement en canary), alors que la doc bun.com le décrit déjà. En 1.4.4, `bun lint` n'est qu'un raccourci pour `bun run lint` : un script `"lint": "bun lint"` s'appelle donc lui-même en boucle. On pourra y revenir quand il sera en stable.
- **ESLint avec ses plugins** : abandonné. On perd l'écosystème de plugins (Next, `turbo/no-undeclared-env-vars`) et la couverture complète de typescript-eslint recommended. oxlint n'active que la catégorie `correctness`, plus les règles hooks React, `no-explicit-any` et `ban-ts-comment`.

## Consequences

- `bun check -b` suit les `references` du `tsconfig.json` racine. Chaque paquet référencé doit donc être `composite`, et un nouveau paquet doit être ajouté à ces `references`.
- Le script s'appelle `typecheck` et non `check`, pour qu'un `"check": "bun check"` ne se rappelle pas lui-même.
