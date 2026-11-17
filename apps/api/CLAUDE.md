# API

Backend Elysia 2 (`2.0.0-rc.3`) sur Bun.

## Skill et doc Elysia

Avant toute modification dans `apps/api/`, invoquer le skill `elysiajs`, même pour un petit changement : l'API d'Elysia 2 diffère de la v1 que le modèle connaît (options avant le handler, TypeBox 1.x, `@elysia/*` pour les plugins).

Vérifier ensuite l'API utilisée dans la doc v2 : https://next.elysiajs.com/ (index pour agent : https://next.elysiajs.com/llms.txt). C'est `next.` parce que le projet est en 2.0.0-rc ; https://elysiajs.com/ documente la v1 et donne des signatures fausses ici.

## Structure

- `src/app.ts` compose l'app et exporte `App` (type partagé avec le client Eden) sans écouter de port.
- `src/index.ts` est le seul endroit qui appelle `.listen()`.
- `Dockerfile` se build depuis la racine (`docker build -f apps/api/Dockerfile .`). Il copie le `package.json` de chaque workspace pour que `bun install --frozen-lockfile` accepte le `bun.lock` racine : tout nouveau workspace dans `apps/` ou `packages/` doit y être ajouté, sinon le build Docker casse.
- Les tests appellent `app.handle()` sans ouvrir de port, avec `bun test`. Chaque route est testée sur son cas nominal et sur son cas de rejet.

## Base de données

PostgreSQL (driver `Bun.SQL`, `drizzle-orm/bun-sql`) + Drizzle stable `0.45` / drizzle-kit `0.31`, voir `docs/adr/0002-postgres-drizzle-migrations-au-demarrage.md`.

- Postgres local : `docker compose up -d` depuis la racine, puis copier `apps/api/.env.example` en `apps/api/.env` (`DATABASE_URL`). `dev`, `test` et `db:*` en ont besoin.
- Le schéma vit dans `src/db/schema.ts` (`drizzle-orm/pg-core`). Après chaque changement : `bun run db:generate`, puis commit du dossier `drizzle/` généré.
- Schémas d'API : TypeBox 1.x (`t` d'Elysia) écrits à la main. `drizzle-orm/typebox`, cité par `.agents/skills/elysiajs/references/drizzle.md`, n'existe qu'en Drizzle 1.0 ; ne pas installer `drizzle-typebox` (TypeBox 0.x, incompatible avec Elysia 2).
- `src/app.ts` exporte `createApp(db)`. La DB est injectée, jamais importée par les routes. `src/index.ts` ouvre `DATABASE_URL`, migre (sous advisory lock), puis crée l'app.
- Dans les tests : `const testDb = await createTestDb()` (`test/helpers/db.ts`) crée une base Postgres migrée propre au fichier ; `afterAll(() => testDb.drop())` la supprime. `createApp(testDb.db)`.
