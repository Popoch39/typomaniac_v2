# Tailwind CSS v4 and shadcn/ui for the frontend

The frontend is styled with Tailwind CSS v4, through the `@tailwindcss/vite` plugin, and builds its UI from shadcn/ui components on the Radix base. The components are copied into the repo by the shadcn CLI (`bunx shadcn@latest add …`), into `apps/frontend/src/shared/components/ui/`, and are treated as vendored code: our components dress them through props and classes, and never edit them. The app's colour palette is mapped onto the shadcn theme tokens in `src/index.css`, with the brand purple as the primary colour, and the light/dark theme follows the system through `prefers-color-scheme` rather than a `.dark` class. The app shell (sidebar, Player block, Ranked, Custom and Profile pages) is the first part built this way; the Duel and Game screens keep their hand-written stylesheets until they are migrated.

## Considered Options

- **Hand-written CSS per component**: rejected. It was the first version of the app shell. Every primitive (a collapsible sidebar with tooltips on its icon rail, an avatar with a fallback, accessible buttons with a visible focus) had to be written and kept accessible by hand, and each stylesheet grew its own breakpoints and colours.
- **A component library installed as a dependency (MUI, Mantine, Chakra)**: rejected. Its look and its runtime styling come with it and are hard to bend to the app's palette; shadcn/ui hands over the source, built on Radix for accessibility and Tailwind for styling.
- **The shared `packages/ui` workspace**: rejected for now. Only the frontend uses these components, and the shadcn CLI expects to write into the app it is run from.

## Consequences

- Five new runtime dependencies come with shadcn/ui: `radix-ui`, `class-variance-authority`, `cn` (class merging), `tw-animate-css` and `shadcn` (its Tailwind stylesheet), next to `tailwindcss` and `@tailwindcss/vite`.
- Tailwind's preflight resets the browser's element styles (headings, buttons, links) for the whole app, including the screens not migrated yet: the few places that relied on them restore what they need.
- Generated files keep shadcn's own patterns, `useEffect` included, which our own code forbids. `apps/frontend/.oxlintrc.json` turns off `react/set-state-in-effect` and `react/only-export-components` for those files only. Running `shadcn add` again over an existing component overwrites it, so nothing of ours may live in those files.
- The `@/` import alias (to `apps/frontend/src`) exists for the generated files, which import each other through it.
