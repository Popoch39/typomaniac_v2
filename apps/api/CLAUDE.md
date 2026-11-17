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
- `src/app.ts` exporte `createApp(db, auth)`. La DB est injectée, jamais importée par les routes. `src/index.ts` ouvre `DATABASE_URL`, migre (sous advisory lock), puis crée l'app.
- Dans les tests : `const testDb = await createTestDb()` (`test/helpers/db.ts`) crée une base Postgres migrée propre au fichier ; `afterAll(() => testDb.drop())` la supprime. `createApp(testDb.db, createTestAuth(testDb.db))`.

## Auth

Better Auth `1.7.25`, branché sur Postgres par son adaptateur Drizzle (`better-auth/adapters/drizzle`, provider `pg`). Ses routes répondent sous `/api/auth` (santé : `GET /api/auth/ok`).

- `src/auth.ts` exporte `createAuth(db, config)`, une fabrique : il n'y a pas d'instance globale à importer. `src/index.ts` lit la config avec `requireAuthConfig()` (qui refuse de démarrer sans `BETTER_AUTH_SECRET` ou `BETTER_AUTH_URL`), fabrique l'instance et l'injecte dans `createApp(db, auth)`.
- Dans les tests : `createTestAuth(testDb.db)` (`test/helpers/auth.ts`) fabrique une instance sur la base du fichier de test.
- L'adaptateur retrouve ses tables dans le schéma passé à Drizzle par `openDatabase`, sous les noms d'export `user`, `session`, `account`, `verification` de `src/db/schema.ts`. Ne pas les renommer.
- L'intégration à Elysia suit `.agents/skills/elysiajs/references/better-auth.md` (`.mount(auth.handler)`, macro pour les routes protégées), pas la doc de Better Auth, écrite pour Elysia 1.
- Importer un plugin par son sous-chemin (`better-auth/plugins/<nom>`), pas par `better-auth/plugins`, qui tire des modules gênants pour la compilation en binaire.

### Régénérer le schéma

À refaire quand une option de `createAuth` change les tables (plugin, champ supplémentaire). Le CLI `auth` charge un fichier qui exporte une instance `auth` ; la fabrique n'en exporte pas, donc on lui donne une config temporaire, non commitée, qui reprend les options de `createAuth` avec un adaptateur sans base :

```ts
// apps/api/auth.cli.tmp.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: "pg" }),
  basePath: "/api/auth",
});
```

```sh
cd apps/api
bunx auth@1.7.25 generate --config ./auth.cli.tmp.ts --output ./auth-schema.tmp.ts -y
```

Relire le fichier généré, reporter les tables dans `src/db/schema.ts`, supprimer les deux fichiers temporaires, puis `bun run db:generate --name <nom>` et commit du dossier `drizzle/`.
