# Base de données : PostgreSQL (Bun.SQL) + Drizzle stable, migrations appliquées au démarrage de l'API

L'API persiste ses données dans PostgreSQL, via Drizzle ORM `0.45` (dernière version stable) et le driver `Bun.SQL` (`drizzle-orm/bun-sql`). Les migrations sont générées par `drizzle-kit generate`, versionnées dans `apps/api/drizzle/`, puis appliquées par le serveur lui-même au démarrage, avant `listen()`, sous un `pg_advisory_lock`. L'image de prod est un binaire Bun compilé sur une base distroless, sans drizzle-kit : c'est pour ça que la migration est intégrée à l'app. Postgres tourne en conteneur : `compose.yaml` (Postgres seul) en dev et pour les tests, `compose.prod.yaml` (Postgres + API) en prod.

## Considered Options

- **SQLite (`bun:sqlite`)** : c'était le premier choix, abandonné avant tout commit. On veut un vrai serveur de base qui accepte plusieurs process API et offre les fonctionnalités Postgres. Un service de plus dans le compose est un coût accepté.
- **Drizzle `1.0.0-rc`** : écarté au profit de la stable. La RC fournit `drizzle-orm/typebox`, qui génère des schémas TypeBox 1.x compatibles avec Elysia 2. Sans elle, les schémas HTTP s'écrivent à la main.
- **`drizzle-typebox` avec Drizzle 0.45** : écarté. Il dépend de `@sinclair/typebox` 0.x, incompatible avec le `typebox` 1.x d'Elysia 2.
- **Driver `postgres` (postgres.js) ou `pg`** : écartés. `Bun.SQL` est intégré au runtime, n'ajoute aucune dépendance et se compile dans le binaire.
- **Tests sur PGlite ou testcontainers** : écartés. PGlite n'est pas le moteur de prod, et testcontainers ajoute une dépendance et un démarrage lent. Les tests utilisent le Postgres du compose de dev.
- **Migrations dans un service séparé** (job ou conteneur dédié) : écarté. Il faudrait une seconde image avec drizzle-kit. Le verrou consultatif suffit à sérialiser plusieurs réplicas.

## Consequences

- `DATABASE_URL` est obligatoire pour lancer l'API, les tests et drizzle-kit.
- `bun test` exige un Postgres démarré (`docker compose up -d`). Chaque fichier de test crée sa propre base, migrée, puis la supprime.
- Le migrator de Drizzle 0.45 refuse de démarrer sans `meta/_journal.json`. Une migration initiale vide (`0000_init.sql`) sert donc de point de départ.
- Passer un jour à Drizzle 1.0 implique de reprendre le format du dossier de migrations et de remplacer les schémas TypeBox écrits à la main par `drizzle-orm/typebox`.
- Le dossier `apps/api/drizzle/` est copié dans l'image runtime. Le serveur le lit depuis son répertoire de travail (`MIGRATIONS_DIR`, défaut `./drizzle`).
- Les données de prod vivent dans le volume nommé `postgres-data` de `compose.prod.yaml`. La stratégie de sauvegarde (`pg_dump` planifié, etc.) reste à décider.
