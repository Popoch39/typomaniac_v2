# Frontend

## Composants

- Chaque composant a une seule responsabilité et reste petit : il rend du JSX, rien d'autre. Dès qu'il grossit ou fait deux choses, le découper en sous-composants.
- Toute la logique (calculs, handlers, accès au store) vit dans un custom hook `useXxx` que le composant appelle.

## State : Zustand

- Le state partagé passe par des stores Zustand, un store par model du domaine (`useUserStore`, `useGameStore`…). Chaque store reste petit : quand il grossit, c'est qu'il contient deux models et qu'il faut le scinder.
- Lire le store avec un sélecteur par valeur, pour que le composant ne se re-rende que quand cette valeur change :
  ```ts
  const score = useGameStore((s) => s.score);
  const addPoint = useGameStore((s) => s.addPoint);
  ```
  Jamais `const { score, addPoint } = useGameStore()` : sans sélecteur, le composant se re-rend à chaque changement du store.

## Effets

`useEffect` est interdit sauf exception validée par l'utilisateur : demander avant d'en écrire un. À la place :

- valeur dérivée → la calculer pendant le rendu ;
- réaction à une action utilisateur → la gérer dans le handler de l'événement ;
- synchronisation entre stores ou avec l'extérieur → l'action du store ou `subscribe` de Zustand.

## Appels API

- Tout appel HTTP passe par TanStack Query (`useQuery`, `useMutation`, ou `queryClient.fetchQuery` avec des `queryOptions` partagées hors React) et par le client Eden typé `apiClient` (`src/shared/api/apiClient.ts`, `treaty<App>` sur le type de `apps/api/src/app.ts`, importé en `import type`). Jamais de `fetch` brut ni de cast `as` sur une réponse. Le `queryClient` partagé vit dans `src/shared/api/queryClient.ts`. Le WebSocket reste un WebSocket.
- Un état en cours se voit : bouton désactivé avec un libellé d'attente (« Creating… »), écran de chargement.
- Une erreur s'affiche toujours (`role="alert"`) et toujours en phrase lisible : jamais « Failed to fetch », un statut HTTP ou un `code` serveur. Passer par `describeApiError` (`src/shared/api/describeApiError.ts`), qui traduit statut, `code` et coupure réseau, et accepte des libellés propres à l'action.
- L'app ne plante jamais : le routeur a un `defaultErrorComponent` et un `defaultNotFoundComponent` qui renvoient vers l'accueil.

## Organisation des fichiers

Ranger par feature, chaque feature dans son sous-dossier, pour que l'app reste maintenable :

```
src/
  features/<feature>/
    components/   # composants de la feature, un par fichier
    hooks/        # custom hooks de la feature
    store/        # store(s) Zustand de la feature
  shared/         # composants et hooks réutilisés par plusieurs features
```

Un fichier ne contient qu'un composant, un hook ou un store, et porte son nom.

## React Compiler

Le React Compiler est activé via le port Rust d'Oxc (`oxc-transform-react`), branché par `react({ compiler: true })` de `@vitejs/plugin-react` dans `vite.config.ts`. Ce n'est pas le plugin Babel. Doc : https://oxc.rs/docs/guide/usage/transformer/react-compiler

- Les composants et hooks sont mémoïsés automatiquement : ne pas ajouter `useMemo`, `useCallback` ou `React.memo` par réflexe.
- Respecter les Rules of React (pas de mutation de props/state, pas d'effet de bord au rendu) : le code qui les enfreint est ignoré silencieusement par le compilateur, sans être optimisé.
- Pour voir ce que le compilateur ignore, passer `compiler: { reportDiagnostics: true }` dans `vite.config.ts`.
- Fonctionnalité expérimentale : la version d'`oxc-transform-react` doit rester dans la plage `peerDependencies` de `@vitejs/plugin-react`.
