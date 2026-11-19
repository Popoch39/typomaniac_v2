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
- `Dockerfile` se build depuis la racine (`docker build -f apps/api/Dockerfile .`). Il copie le `package.json` de chaque workspace pour que `bun install --frozen-lockfile` accepte le `bun.lock` racine : tout nouveau workspace dans `apps/` ou `packages/` doit y être ajouté, sinon le build Docker casse. Les packages que l'API importe (`@repo/typing-engine`, `@repo/duel-engine`, `@repo/ranked-engine`, `@repo/matchmaking-engine`, `@repo/redis`, `@repo/logger`, `@repo/queue`) sont compilés depuis leurs sources : leur dossier entier doit aussi être copié avant `bun build`, sinon l'import ne se résout pas. `apps/matchmaker/Dockerfile` suit la même règle.
- Les tests appellent `app.handle()` sans ouvrir de port, avec `bun test`. Chaque route est testée sur son cas nominal et sur son cas de rejet. Exception : une route WebSocket ne s'upgrade pas par `app.handle()`, ses tests font `.listen(0)` et passent par de vrais clients HTTP et WebSocket (`test/helpers/socket.ts`).

## Base de données

PostgreSQL (driver `Bun.SQL`, `drizzle-orm/bun-sql`) + Drizzle stable `0.45` / drizzle-kit `0.31`, voir `docs/adr/0002-postgres-drizzle-migrations-at-startup.md`.

- Postgres local : `docker compose up -d` depuis la racine, puis copier `apps/api/.env.example` en `apps/api/.env` (`DATABASE_URL`). `dev`, `test` et `db:*` en ont besoin.
- Le schéma vit dans `src/db/schema.ts` (`drizzle-orm/pg-core`). Après chaque changement : `bun run db:generate`, puis commit du dossier `drizzle/` généré.
- Schémas d'API : TypeBox 1.x (`t` d'Elysia) écrits à la main. `drizzle-orm/typebox`, cité par `.agents/skills/elysiajs/references/drizzle.md`, n'existe qu'en Drizzle 1.0 ; ne pas installer `drizzle-typebox` (TypeBox 0.x, incompatible avec Elysia 2).
- `src/app.ts` exporte `createApp(db, auth, redis, logger, options?)`, les options facultatives réunies dans un seul objet `AppOptions` (`{ duel, queue, dev, lifecycle, rateLimit }`). La DB est injectée, jamais importée par les routes. `src/index.ts` ouvre `DATABASE_URL`, migre (sous advisory lock), puis crée l'app.
- Dans les tests : `const testDb = await createTestDb()` (`test/helpers/db.ts`) crée une base Postgres migrée propre au fichier ; `afterAll(() => testDb.drop())` la supprime. `createApp(testDb.db, createTestAuth(testDb.db), testRedis.redis, getLogger("api"))`.

## Redis

Client intégré de Bun (`RedisClient`), sans dépendance. Il porte les Duels en cours (`src/modules/duel/`), voir `docs/adr/0007-live-duel-in-memory-engine-redis-journal.md`.

- Redis local : lancé par le même `docker compose up -d` que Postgres ; `REDIS_URL` dans `apps/api/.env`. `src/index.ts` refuse de démarrer sans lui, avant d'ouvrir Postgres.
- `openRedis` et `requireRedisUrl` vivent dans `packages/redis` (`@repo/redis`), que le matchmaker utilise aussi ; `src/redis/client.ts` les ré-exporte et reste le seul chemin d'import dans l'API.
- `openRedis(url, namespace)` rend `{ client, subscriber, name, close }` : toute clé et tout canal se nomment par `name(...)`, jamais en dur, pour rester sous le namespace. `subscriber` est une connexion à part, car un client abonné n'accepte plus d'autre commande.
- Redis est injecté comme la base : `createApp(db, auth, redis, logger)`.
- Dans les tests : `const testRedis = await createTestRedis()` (`test/helpers/redis.ts`) ouvre Redis sous un namespace propre au fichier ; `afterAll` appelle `testRedis.drop()`, qui efface ses clés et ferme les connexions.

## Logs

`@repo/logger` (`packages/logger`, LogTape), partagé avec le matchmaker. `src/index.ts` appelle `setupLogger()` une fois : lignes JSON sur stdout sous `NODE_ENV=production`, lignes lisibles sinon, niveau par `LOG_LEVEL` (`info` par défaut).

- Le logger est injecté comme la base : `createApp(db, auth, redis, logger)` passe `logger.getChild("<module>")` aux modules qui loguent. Aucun module n'importe `getLogger`.
- `src/modules/http/` (`createRequestLog`, monté en premier dans `createApp`) donne à chaque requête un id frais (`x-request-id`, jamais celui du client), écrit une ligne `api.http` par réponse (route en motif, statut, durée, `playerId` ou `guestId`), sauf `/health`, `/ready` et les sockets acceptés (un upgrade refusé a sa ligne, écrite par le `mapResponse` global, qu'il passe au lieu de `onAfterResponse`), et change toute erreur inattendue en 500 `{ code: "INTERNAL_ERROR", requestId }`. Une route WebSocket logue elle-même ouverture, fermeture (code) et erreurs de ses handlers (option `error: logSocketFailure(logger, message, describe?)` de `src/modules/http/`), jamais ses messages.
- Pas de `console.*` dans `src/`. Message à gabarit et propriétés : `logger.error("Could not advance Duel {duelId}", { duelId, error })`. Jamais de cookie, d'en-tête `authorization` ni de secret en propriété.
- Dans les tests, sans `setupLogger` les loggers ne sortent rien. Pour lire les records : `await setupLogger({ sink: (record) => void records.push(record) })`, puis `resetLogger()` en `afterAll` (voir `test/logging.test.ts`).

## Readiness et arrêt

- `/health` est la sonde de vie : `ok` tant que le process répond, même sans Postgres ni Redis, pour qu'une panne de base ne le fasse pas redémarrer en boucle.
- `/ready` (`src/modules/lifecycle/`) répond 200 quand un `select 1` sur Postgres et un `PING` sur Redis répondent tous deux dans `READY_TIMEOUT_MS` (1 s), 503 sinon, et 503 dès que l'arrêt a commencé.
- `createLifecycle()` (`src/modules/lifecycle/service.ts`) porte l'état d'arrêt de l'instance et ses sockets ouverts. `createApp` le reçoit en option `lifecycle` (un neuf par défaut) et le passe aux modules `duel` et `queue` : tout socket fait `lifecycle.hold(ws.id, ws)` au début de `open` (et s'arrête là s'il est refusé) et `lifecycle.release(ws.id)` au début de `close`. Un nouveau module de sockets doit faire de même, sinon l'arrêt le coupe sans code 1012.
- Sur SIGTERM ou SIGINT, `src/index.ts` arrête l'instance, chaque étape loguée :
  1. `lifecycle.beginStopping()` : `/ready` répond 503, un nouveau socket est fermé aussitôt en 1012.
  2. `lifecycle.closeSockets()` ferme chaque socket Duel et Queue en 1012 (« service restart ») et attend qu'ils soient fermés : le `close` d'Elysia lance le handler de fermeture avant d'envoyer la trame, que `app.stop()` couperait.
  3. `app.stop()` lance les hooks d'arrêt : le sweep des Duels en cours finit, les rafraîchissements de la Queue s'arrêtent.
  4. Fermeture de Redis puis de Postgres.
  5. Sortie 0.

  Les sockets se ferment avant `app.stop()` : Elysia 2 y coupe (`terminate`) tout socket encore ouvert, que le client verrait en 1006 au lieu de 1012. Un minuteur de 10 s force la sortie 1 si une étape bloque. Aucun Duel n'est perdu : son état est dans Redis (ADR 0007), le Participant qui se reconnecte sur une autre instance reprend son siège et rejoue son journal. Aucune place dans la Queue non plus : un socket de Queue fermé en 1012 ou 1006 (`mayReconnect`, `src/modules/lifecycle/closeCode.ts`) garde son entrée une expiration (`entryExpiryMs`), que la reconnexion reprend avec son `queuedAt` ; toute autre fermeture la retire.

- Dans les tests : `createApp(db, auth, redis, logger, { lifecycle })` puis `lifecycle.beginStopping()` / `closeSockets()` (`test/ready.test.ts`, `test/shutdown.test.ts`) ; le vrai signal se teste en `Bun.spawn` (`test/startup.test.ts`). `closed` des sockets de `test/helpers/socket.ts` rend le code de fermeture.

## Rate limit

Voir `docs/adr/0013-rate-limits-keyed-on-identity-then-ip-behind-trust-proxy.md`. `src/modules/rate-limit/` compte en fenêtre fixe dans Redis (clés `rate-limit:*`, `consumeWindow`, partagé avec le rate limit de Better Auth).

- `createApp` crée le `RateLimiter` et la `Protection` (`createProtection(auth, rateLimiter)`, une seule fois) ; il passe la `Protection` à chaque module de routes, et le `RateLimiter` seulement aux modules qui comptent eux-mêmes (`player`, `duel`, `queue`). Limites par défaut : `RATE_LIMITS` ; l'option `rateLimit` de `createApp` les abaisse en test et porte `trustProxy`.
- Dans un handler : `const refused = await rateLimiter.check("<limite>", key, set); if (refused) return refused;` répond 429 `{ code: "RATE_LIMITED" }` avec `Retry-After` et logue un warning. Clé : l'id du Player ou du Guest, plus `rateLimiter.clientIp(request, server)` pour une route ouverte aux Guests. Une clé `null` ne compte rien : seul `app.handle()` n'a pas d'IP, donc les tests de limites par IP font `.listen(0)` (`test/rate-limit.test.ts`).
- Sockets : l'upgrade est compté dans `beforeHandle` (`duelSocket`, `queueSocket`, par Participant), avant toute lecture ; le 429 doit figurer dans le `response` du modèle du socket (`429: RateLimited`, exporté par `src/modules/rate-limit/index.ts`). Les messages d'un socket de Duel sont comptés dans son hook `parse`, avant la validation du corps (un message mal formé compte aussi), en mémoire sur l'instance qui le tient (`SOCKET_MESSAGE_LIMIT`, 60/s, `rateLimit.socketMessages` en test) : au-delà, le message est jeté et le socket fermé en 1008, warning logué ; le Participant est absent comme à toute déconnexion (`test/socket-rate-limit.test.ts`).
- IP client : adresse du socket ; `X-Forwarded-For` (le plus à gauche) seulement avec `TRUST_PROXY=enabled` (`src/modules/rate-limit/config.ts`).

## Auth

Better Auth `1.7.25`, branché sur Postgres par son adaptateur Drizzle (`better-auth/adapters/drizzle`, provider `pg`). Ses routes répondent sous `/api/auth` (santé : `GET /api/auth/ok`).

- `src/modules/auth/service.ts` exporte `createAuth(db, config)`, une fabrique : il n'y a pas d'instance globale à importer. `src/index.ts` lit la config avec `requireAuthConfig()` (`src/modules/auth/config.ts`, qui refuse de démarrer sans `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DISCORD_CLIENT_ID` ou `DISCORD_CLIENT_SECRET`), fabrique l'instance et l'injecte dans `createApp(db, auth)`.
- Rate limit de Better Auth : `createAuth(db, config, { redis })` le branche, ses compteurs dans Redis sous le namespace de l'API (clés `auth-rate-limit:*`, fenêtre fixe, un `EVAL` atomique), pour qu'il tienne entre instances. Il passe par `rateLimit.customStorage`, pas par `secondaryStorage` de Better Auth, qui sortirait aussi les sessions et l'état OAuth de Postgres. Actif en production seulement (défaut de Better Auth, `enabled` le force) ; limites par défaut de Better Auth (3 / 10 s sur `/sign-in/*`, 100 / 10 s ailleurs, par IP), surchargées par `customRules`. Au-delà, Better Auth répond 429 `{ message }` avec `X-Retry-After` : `createAuthRoutes` le remplace par la réponse de toutes les limites (`rateLimiter.refuse("auth", ip, ...)` : 429 `{ code: "RATE_LIMITED" }`, `Retry-After`, warning `api.rate-limit` avec la limite et la clé). Sans troisième argument, le rate limit est coupé.
- Dans les tests : `createTestAuth(testDb.db)` (`test/helpers/auth.ts`) fabrique une instance sur la base du fichier de test, sans rate limit ; `createTestAuth(testDb.db, { redis, enabled: true, customRules })` l'active avec des limites abaissées (`test/auth-rate-limit.test.ts`).
- L'adaptateur retrouve ses tables dans le schéma passé à Drizzle par `openDatabase`, sous les noms d'export `user`, `session`, `account`, `verification` de `src/db/schema.ts`. Ne pas les renommer.
- L'intégration à Elysia suit `.agents/skills/elysiajs/references/better-auth.md` (macro pour les routes protégées), pas la doc de Better Auth, écrite pour Elysia 1. Ses routes passent par `createAuthRoutes` (`src/modules/auth/index.ts`, `parse: "none"` comme un `.mount`) plutôt que `.mount(auth.handler)` : un mount ne voit pas le socket, et Better Auth doit recevoir l'IP client résolue par l'API dans l'en-tête `CLIENT_IP_HEADER` (toujours réécrit), seul en-tête qu'il lit (`advanced.ipAddress.ipAddressHeaders`).
- Deux niveaux de protection, en option de route (`createProtection(auth)`, `src/modules/auth/index.ts`), qui donnent `player` et `session` au handler. En mettre une seule par route.
  - `signedIn: true`, « connecté » : 401 `{ code: "UNAUTHORIZED" }` sans session valide. `player.nickname` peut être `null`.
  - `nicknameChosen: true`, « Nickname choisi » : même 401 pour un Guest, 403 `{ code: "NICKNAME_REQUIRED" }` pour un Player sans Nickname. `player.nickname` est une chaîne. C'est le niveau des routes qui enregistrent ou affichent publiquement quelque chose.
  - `participant: true`, « Participant » : un Player avec Nickname ou un Guest, donnés en `identity` (`{ id, name, playerId }`, `playerId` à `null` pour un Guest). Même 403 pour un Player sans Nickname. Sans session, c'est un Guest, reconnu par le cookie `guest` signé avec le secret d'auth (`src/modules/auth/guest.ts`, aucune ligne en base) ; à défaut d'un cookie valide, un nouveau Guest est émis et son cookie posé dans `set.headers`. Une route WebSocket doit le recopier dans la réponse d'upgrade (`upgrade: ({ set }) => set.headers`), sinon il est perdu.
  - Chaque module de routes reçoit la `Protection` de `createApp` (type `Protection`) et doit la `.use(protection)` pour avoir les options et leurs types.
- Le Nickname est une colonne maison de la table `user` (`nickname`, `null` tant qu'il n'est pas choisi), déclarée à Better Auth comme champ supplémentaire avec `input: false` : il sort dans la session, mais les routes de Better Auth ne l'écrivent pas. Il est écrit par `PUT /api/me/nickname` et, à la création du Player, par le hook `databaseHooks.user.create.after` (`assignDefaultNickname`), qui part du nom d'utilisateur du fournisseur : `mapProfileToUser` met le `login` GitHub ou le `username` Discord dans la colonne `name`, voir l'ADR 0004. Ses règles vivent dans `src/modules/player/` (format dans `model.ts`, réservés et enregistrement dans `service.ts`). Un Nickname mal formé reçoit 422 `{ code: "NICKNAME_INVALID" }`, posé par l'option `error` du schéma `nickname` : sans elle, Elysia répond par son document par défaut (`code: "validation"`), vidé de son détail en production. L'unicité à la casse près est tenue par l'index unique sur `lower(nickname)` : le 409 vient de sa violation, ne pas ajouter de lecture préalable.
- Dans les tests : `signInPlayer(auth)` (`test/helpers/auth.ts`) crée un Player sans Nickname (nom vide, donc pas de Nickname par défaut) et rend `{ player, cookie }`, le cookie étant à passer dans l'en-tête `cookie` de la requête. Pour lui donner un Nickname, passer par `PUT /api/me/nickname`.
- Connexion par GitHub et Discord seulement, voir `docs/adr/0004-oauth-only-sign-in-merge-by-verified-email.md`. `refuseUnverifiedEmail` (`user.validateUserInfo`) refuse toute adresse que le fournisseur ne marque pas vérifiée. `trustedProviders` et la désactivation de `/link-social` n'ont de sens qu'avec lui : ne pas toucher à l'un sans relire l'ADR.
- À cause de `validateUserInfo`, `internalAdapter.createUser` échoue hors d'une requête (`validation_context_missing`) : dans un test, passer par `signInPlayer` ou par le faux fournisseur de `test/oauth.test.ts`, qui remplace les API HTTP de GitHub et Discord et joue le vrai flux.
- Connexion de dev : `POST /api/dev/sign-in` (`src/modules/dev/`) connecte en un clic à `dev_alice` ou `dev_bob`, créés au premier appel, pour jouer un Duel contre soi-même dans deux fenêtres. Répond 404 sauf si `DEV_SIGN_IN=enabled` ; l'API refuse de démarrer avec lui sous `NODE_ENV=production`. Le front n'affiche ses boutons qu'en `import.meta.env.DEV`.
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
