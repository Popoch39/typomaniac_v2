# API

Backend Elysia 2 (`2.0.0-rc.3`) sur Bun.

## Skill et doc Elysia

Avant toute modification dans `apps/api/`, invoquer le skill `elysiajs`, même pour un petit changement : l'API d'Elysia 2 diffère de la v1 que le modèle connaît (options avant le handler, TypeBox 1.x, `@elysia/*` pour les plugins).

Vérifier ensuite l'API utilisée dans la doc v2 : https://next.elysiajs.com/ (index pour agent : https://next.elysiajs.com/llms.txt). C'est `next.` parce que le projet est en 2.0.0-rc ; https://elysiajs.com/ documente la v1 et donne des signatures fausses ici.

## Structure

```text
src/
  index.ts          Démarrage : lit la config, ouvre et migre la base, appelle .listen()
  app.ts            Composition : monte Better Auth et .use() chaque module, exporte App
  db/
    client.ts       Ouverture et migration de la base
    schema.ts       Toutes les tables Drizzle
  redis/
    client.ts       Ré-exporte l'ouverture de Redis du package `@repo/redis`, partagé avec `apps/matchmaker`
  modules/
    <module>/
      index.ts      Routes et comportement HTTP du module (instance ou plugin Elysia)
      model.ts      Schémas TypeBox des requêtes et réponses, avec leurs types dérivés
      service.ts    Règles métier et accès aux données, sans contexte Elysia
test/
  <sujet>.test.ts   Tests par app.handle()
  helpers/          Base et auth de test
```

- Tout code métier vit dans un module de `src/modules/`, un dossier par domaine (`auth`, `player`), nommé au singulier avec le terme du glossaire. Rien d'autre à la racine de `src/` que `index.ts`, `app.ts`, `db/` et `redis/`.
- Un module a les trois mêmes fichiers, `index.ts`, `model.ts`, `service.ts`. Un fichier qui serait vide n'est pas créé (`auth` n'a pas de `model.ts`). Un quatrième fichier n'est ajouté que pour une responsabilité distincte, nommée par ce qu'il contient (`auth/config.ts` : variables d'environnement).
- `index.ts` exporte une fabrique `create<Module>Routes(db, auth)` qui rend une instance Elysia préfixée. Les handlers y restent en ligne : ils possèdent validation, statuts et cookies, et passent des valeurs simples au service, jamais le contexte.
- `model.ts` décrit le contrat d'API, pas les tables. Un groupe par route, nommé `[Chemin][Méthode]` relatif au préfixe (`PUT /nickname` donne `NicknamePut`), avec ses schémas sous `Body`, `Params`, `Query`, `Response`. Il s'importe en `import * as PlayerModel from "./model.ts"`. Un type n'est dérivé (`UnwrapModels`) que lorsqu'un service en a besoin.
- `service.ts` ne connaît ni `status()` ni le contexte : il rend un résultat (`"saved" | "taken"`) que la route traduit en réponse HTTP.
- Un module n'importe d'un autre que son `index.ts` ou son `service.ts`, jamais l'inverse en cycle. `player` dépend de `auth`, pas le contraire, à une exception : `auth/service.ts` importe `player/service.ts` pour le Nickname par défaut (pas de cycle, `player/service.ts` n'importe que la base).
- Les tables restent toutes dans `src/db/schema.ts` : l'adaptateur Better Auth et drizzle-kit lisent ce seul fichier.
- `src/app.ts` compose l'app et exporte `App` (type partagé avec le client Eden) sans écouter de port. Il ne déclare aucune route métier : une nouvelle route va dans son module.
- `src/index.ts` est le seul endroit qui appelle `.listen()`.
- `Dockerfile` se build depuis la racine (`docker build -f apps/api/Dockerfile .`). Il copie le `package.json` de chaque workspace pour que `bun install --frozen-lockfile` accepte le `bun.lock` racine : tout nouveau workspace dans `apps/` ou `packages/` doit y être ajouté, sinon le build Docker casse. Les packages que l'API importe (`@repo/typing-engine`, `@repo/duel-engine`, `@repo/ranked-engine`, `@repo/matchmaking-engine`, `@repo/redis`, `@repo/queue`) sont compilés depuis leurs sources : leur dossier entier doit aussi être copié avant `bun build`, sinon l'import ne se résout pas. `apps/matchmaker/Dockerfile` suit la même règle.
- Les tests appellent `app.handle()` sans ouvrir de port, avec `bun test`. Chaque route est testée sur son cas nominal et sur son cas de rejet. Exception : une route WebSocket ne s'upgrade pas par `app.handle()`, ses tests font `.listen(0)` et passent par de vrais clients HTTP et WebSocket (`test/helpers/socket.ts`).

## Base de données

PostgreSQL (driver `Bun.SQL`, `drizzle-orm/bun-sql`) + Drizzle stable `0.45` / drizzle-kit `0.31`, voir `docs/adr/0002-postgres-drizzle-migrations-at-startup.md`.

- Postgres local : `docker compose up -d` depuis la racine, puis copier `apps/api/.env.example` en `apps/api/.env` (`DATABASE_URL`). `dev`, `test` et `db:*` en ont besoin.
- Le schéma vit dans `src/db/schema.ts` (`drizzle-orm/pg-core`). Après chaque changement : `bun run db:generate`, puis commit du dossier `drizzle/` généré.
- Schémas d'API : TypeBox 1.x (`t` d'Elysia) écrits à la main. `drizzle-orm/typebox`, cité par `.agents/skills/elysiajs/references/drizzle.md`, n'existe qu'en Drizzle 1.0 ; ne pas installer `drizzle-typebox` (TypeBox 0.x, incompatible avec Elysia 2).
- `src/app.ts` exporte `createApp(db, auth, redis)`. La DB est injectée, jamais importée par les routes. `src/index.ts` ouvre `DATABASE_URL`, migre (sous advisory lock), puis crée l'app.
- Dans les tests : `const testDb = await createTestDb()` (`test/helpers/db.ts`) crée une base Postgres migrée propre au fichier ; `afterAll(() => testDb.drop())` la supprime. `createApp(testDb.db, createTestAuth(testDb.db), testRedis.redis)`.

## Redis

Client intégré de Bun (`RedisClient`), sans dépendance. Il porte les Duels en cours (`src/modules/duel/`), voir `docs/adr/0007-live-duel-in-memory-engine-redis-journal.md`.

- Redis local : lancé par le même `docker compose up -d` que Postgres ; `REDIS_URL` dans `apps/api/.env`. `src/index.ts` refuse de démarrer sans lui, avant d'ouvrir Postgres.
- `openRedis` et `requireRedisUrl` vivent dans `packages/redis` (`@repo/redis`), que le matchmaker utilise aussi ; `src/redis/client.ts` les ré-exporte et reste le seul chemin d'import dans l'API.
- `openRedis(url, namespace)` rend `{ client, subscriber, name, close }` : toute clé et tout canal se nomment par `name(...)`, jamais en dur, pour rester sous le namespace. `subscriber` est une connexion à part, car un client abonné n'accepte plus d'autre commande.
- Redis est injecté comme la base : `createApp(db, auth, redis)`.
- Dans les tests : `const testRedis = await createTestRedis()` (`test/helpers/redis.ts`) ouvre Redis sous un namespace propre au fichier ; `afterAll` appelle `testRedis.drop()`, qui efface ses clés et ferme les connexions.

## Auth

Better Auth `1.7.25`, branché sur Postgres par son adaptateur Drizzle (`better-auth/adapters/drizzle`, provider `pg`). Ses routes répondent sous `/api/auth` (santé : `GET /api/auth/ok`).

- `src/modules/auth/service.ts` exporte `createAuth(db, config)`, une fabrique : il n'y a pas d'instance globale à importer. `src/index.ts` lit la config avec `requireAuthConfig()` (`src/modules/auth/config.ts`, qui refuse de démarrer sans `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DISCORD_CLIENT_ID` ou `DISCORD_CLIENT_SECRET`), fabrique l'instance et l'injecte dans `createApp(db, auth)`.
- Dans les tests : `createTestAuth(testDb.db)` (`test/helpers/auth.ts`) fabrique une instance sur la base du fichier de test.
- L'adaptateur retrouve ses tables dans le schéma passé à Drizzle par `openDatabase`, sous les noms d'export `user`, `session`, `account`, `verification` de `src/db/schema.ts`. Ne pas les renommer.
- L'intégration à Elysia suit `.agents/skills/elysiajs/references/better-auth.md` (`.mount(auth.handler)`, macro pour les routes protégées), pas la doc de Better Auth, écrite pour Elysia 1.
- Deux niveaux de protection, en option de route (`createProtection(auth)`, `src/modules/auth/index.ts`), qui donnent `player` et `session` au handler. En mettre une seule par route.
  - `signedIn: true`, « connecté » : 401 `{ code: "UNAUTHORIZED" }` sans session valide. `player.nickname` peut être `null`.
  - `nicknameChosen: true`, « Nickname choisi » : même 401 pour un Guest, 403 `{ code: "NICKNAME_REQUIRED" }` pour un Player sans Nickname. `player.nickname` est une chaîne. C'est le niveau des routes qui enregistrent ou affichent publiquement quelque chose.
  - `participant: true`, « Participant » : un Player avec Nickname ou un Guest, donnés en `identity` (`{ id, name, playerId }`, `playerId` à `null` pour un Guest). Même 403 pour un Player sans Nickname. Sans session, c'est un Guest, reconnu par le cookie `guest` signé avec le secret d'auth (`src/modules/auth/guest.ts`, aucune ligne en base) ; à défaut d'un cookie valide, un nouveau Guest est émis et son cookie posé dans `set.headers`. Une route WebSocket doit le recopier dans la réponse d'upgrade (`upgrade: ({ set }) => set.headers`), sinon il est perdu.
  - Chaque module de routes doit `.use(createProtection(auth))` pour avoir les options et leurs types.
- Le Nickname est une colonne maison de la table `user` (`nickname`, `null` tant qu'il n'est pas choisi), déclarée à Better Auth comme champ supplémentaire avec `input: false` : il sort dans la session, mais les routes de Better Auth ne l'écrivent pas. Il est écrit par `PUT /api/me/nickname` et, à la création du Player, par le hook `databaseHooks.user.create.after` (`assignDefaultNickname`), qui part du nom d'utilisateur du fournisseur : `mapProfileToUser` met le `login` GitHub ou le `username` Discord dans la colonne `name`, voir l'ADR 0004. Ses règles vivent dans `src/modules/player/` (format dans `model.ts`, réservés et enregistrement dans `service.ts`). Un Nickname mal formé reçoit 422 `{ code: "NICKNAME_INVALID" }`, posé par l'option `error` du schéma `nickname` : sans elle, Elysia répond par son document par défaut (`code: "validation"`), vidé de son détail en production. L'unicité à la casse près est tenue par l'index unique sur `lower(nickname)` : le 409 vient de sa violation, ne pas ajouter de lecture préalable.
- Dans les tests : `signInPlayer(auth)` (`test/helpers/auth.ts`) crée un Player sans Nickname (nom vide, donc pas de Nickname par défaut) et rend `{ player, cookie }`, le cookie étant à passer dans l'en-tête `cookie` de la requête. Pour lui donner un Nickname, passer par `PUT /api/me/nickname`.
- Connexion par GitHub et Discord seulement, voir `docs/adr/0004-oauth-only-sign-in-merge-by-verified-email.md`. `refuseUnverifiedEmail` (`user.validateUserInfo`) refuse toute adresse que le fournisseur ne marque pas vérifiée. `trustedProviders` et la désactivation de `/link-social` n'ont de sens qu'avec lui : ne pas toucher à l'un sans relire l'ADR.
- À cause de `validateUserInfo`, `internalAdapter.createUser` échoue hors d'une requête (`validation_context_missing`) : dans un test, passer par `signInPlayer` ou par le faux fournisseur de `test/oauth.test.ts`, qui remplace les API HTTP de GitHub et Discord et joue le vrai flux.
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
