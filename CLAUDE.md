@AGENTS.md

## Frontend

Avant toute tâche dans `apps/frontend/`, lire `apps/frontend/CLAUDE.md` : il fixe les règles de composants, de state Zustand, d'effets et de rangement des fichiers.

## Backend

Avant toute tâche dans `apps/api/`, même une lecture ou un petit fix, lire `apps/api/CLAUDE.md` en entier puis invoquer le skill `elysiajs` : il fixe la version d'Elysia, la doc à consulter et les règles du backend.

## Vérification

Après chaque changement, lancer depuis la racine `bun run lint`, `bun run fmt` et `bun run typecheck`. Une tâche n'est terminée que lorsqu'il ne reste aucune erreur ni aucun warning.
