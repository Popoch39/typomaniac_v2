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

## Styles : Tailwind CSS v4 + shadcn/ui

- Le style passe par les classes Tailwind (v4, plugin `@tailwindcss/vite`) dans le JSX. Pas de fichier `.css` par composant : seul `src/index.css` porte du CSS (thème, base, et ce que Tailwind ne sait pas exprimer en classe, sous `@theme` / `@utility`).
- Le design system est **Typomaniac Arcade** (https://claude.ai/artifact/TaZWdRxRbQPo9PpRJVE1X7) : un plateau sombre à picots où tout ce qui se presse est une touche (keycap). Le lire (README et composants) avant de créer ou restyler une surface. Il n'a qu'un thème, sombre : la variante `dark:` s'applique toujours.
- Les couleurs passent par les tokens du thème, définis dans `src/index.css` : ceux du design system (`bg-surface-card`, `bg-key-face`, `border-key-outline`, `bg-brand`, `bg-action`, `text-ink`, `text-ink-muted`, `text-ink-subtle`, `fill-tier-gold`…) et ceux de shadcn qui y sont mappés (`bg-background`, `text-foreground`, `bg-primary`…). L'`accent` du design system (le vert lime de l'action et de la victoire) s'appelle `action` ici, car shadcn possède déjà `accent`. Le rouge `danger` porte la défaite et les erreurs (texte `role="alert"`, `Keycap variant="danger"`) ; le `destructive` de shadcn y est mappé. Jamais de couleur en dur dans une classe.
- Les briques du design system vivent dans `src/index.css` (`@utility keycap`, `keycap-pressed`, `key-travel`, `plate-dots`, styles de texte `type-*`) et dans `src/shared/components/` (`Keycap`, `LetterKey`, `KeyWord`, `Panel`, `PageHeader`, `StrokeIcon`). Toute action pressable est un `Keycap`, pas un `Button` shadcn ; les icônes sont des `StrokeIcon`, pas lucide.
- Les primitives d'UI viennent de shadcn/ui (base Radix, style `radix-nova`, voir `components.json`). Elles vivent dans `src/shared/components/ui/`, le hook `use-mobile.ts` dans `src/shared/hooks/` et `cn` dans `src/shared/lib/utils.ts`. Avant d'écrire un bouton, une carte, un avatar, une tooltip… chercher le composant shadcn correspondant.
- Ajouter un composant uniquement avec la CLI, depuis `apps/frontend/` : `bunx shadcn@latest add <composant>`, puis `bun run fmt` à la racine. Ne pas écrire un composant shadcn à la main.
- Les fichiers générés par shadcn sont du code vendored : on ne les modifie pas, on les habille depuis nos composants (`className`, props). Un composant à nous qui s'en sert garde son nom de domaine (`PlayerAvatar` autour d'`Avatar`, `ShellSidebar` autour de `Sidebar`).
- Le breakpoint `md` (768px) sépare le téléphone (message plein écran, `max-md:`) du reste ; la rail d'icônes de la sidebar couvre 768–1024px.

## Layout shifts

Aucun layout shift n'est toléré : ni au chargement, ni après une action, ni quand une requête revient. Un élément déjà affiché ne bouge et ne change de taille que si l'utilisateur l'a demandé.

- Un composant qui change d'état garde la même boîte dans tous ses états : réserver la taille du plus grand. Ex. : `OrnamentedAvatar` garde la boîte du cadre même sans Ornament ; un tag de `Panel` qui va et vient reste rendu avec `isTagHidden` au lieu d'être retiré.
- Une page attend toutes les lectures dont dépend sa mise en page derrière une seule gate (`ProfileGate` pour Profile, `StandingGate` autour de toute la grille de Ranked), lectures lancées en parallèle et non en cascade, plutôt que d'insérer ses panneaux un à un à mesure que les requêtes reviennent. Rien ne s'insère jamais au-dessus ou entre des éléments déjà affichés.
- Une ligne de texte qui arrive après le reste réserve sa hauteur (`min-h-lh`, contenu vide en attendant) au lieu d'apparaître.
- Un bloc ancré en bas (pied de la sidebar) n'est rendu qu'une fois son contenu connu, sinon il grandit vers le haut.
- `scrollbar-gutter: stable` sur `html` (`src/index.css`) empêche la barre de défilement de rétrécir la page quand elle apparaît : ne pas l'enlever.
- Vérifier dans Chrome avec un `PerformanceObserver` de type `layout-shift` (`buffered: true`), en comptant aussi les entrées `hadRecentInput: true` : l'utilisateur les voit même si le CLS les ignore. Simuler de la latence réseau, car les sauts arrivent souvent quand une requête revient.

## Effets

`useEffect` est interdit sauf exception validée par l'utilisateur : demander avant d'en écrire un. À la place :

- valeur dérivée → la calculer pendant le rendu ;
- réaction à une action utilisateur → la gérer dans le handler de l'événement ;
- synchronisation entre stores ou avec l'extérieur → l'action du store ou `subscribe` de Zustand (ou `useSyncExternalStore` pour une source du navigateur, comme `matchMedia`).

Seule exception validée : les fichiers générés par shadcn (`src/shared/components/ui/`, `src/shared/hooks/use-mobile.ts`) gardent leurs `useEffect`. Pour eux seuls, `apps/frontend/.oxlintrc.json` coupe `react/set-state-in-effect` et `react/only-export-components`. Notre propre code n'en écrit toujours pas. Le même fichier coupe aussi `typescript/restrict-template-expressions`, pour le seul `src/shared/components/ui/chart.tsx` (généré par shadcn, il interpole des valeurs non textuelles dans ses classes et variables CSS) : ne pas élargir l'exception à tout `ui/`.

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

La logique pure d'une feature (fonctions sans React ni store, testées directement) vit dans un dossier nommé par son domaine, à côté de `components/` (`duel/round/`, `duel/clock/`, `duel/points/`, `queue/clock/`…), listé dans `test/tsconfig.json` pour que ses tests compilent. Un store peut aussi se tester par son API vanilla (`getState()`, sans React) : son dossier et ceux qu'il importe sont alors listés dans `test/tsconfig.json` (`game/store/`, `game/clock/`).

Un fichier ne contient qu'un composant, un hook ou un store, et porte son nom.

## React Compiler

Le React Compiler est activé via le port Rust d'Oxc (`oxc-transform-react`), branché par `react({ compiler: true })` de `@vitejs/plugin-react` dans `vite.config.ts`. Ce n'est pas le plugin Babel. Doc : https://oxc.rs/docs/guide/usage/transformer/react-compiler

- Les composants et hooks sont mémoïsés automatiquement : ne pas ajouter `useMemo`, `useCallback` ou `React.memo` par réflexe.
- Respecter les Rules of React (pas de mutation de props/state, pas d'effet de bord au rendu) : le code qui les enfreint est ignoré silencieusement par le compilateur, sans être optimisé.
- Pour voir ce que le compilateur ignore, passer `compiler: { reportDiagnostics: true }` dans `vite.config.ts`.
- Fonctionnalité expérimentale : la version d'`oxc-transform-react` doit rester dans la plage `peerDependencies` de `@vitejs/plugin-react`.
