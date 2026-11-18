# Tailwind CSS v4 and shadcn/ui for the frontend

The frontend is styled with Tailwind CSS v4, through the `@tailwindcss/vite` plugin, and builds its UI from shadcn/ui components on the Radix base. The components are copied into the repo by the shadcn CLI (`bunx shadcn@latest add …`), into `apps/frontend/src/shared/components/ui/`, and are treated as vendored code: our components dress them through props and classes, and never edit them. The app's colour palette is mapped onto the shadcn theme tokens in `src/index.css`, with the brand purple as the primary colour, and the light/dark theme follows the system through `prefers-color-scheme` rather than a `.dark` class. The whole app is styled this way, the app shell and the Duel and Game screens alike: `src/index.css` is the only CSS file, and holds the theme and what Tailwind cannot express as a class.

## Considered Options

- **Hand-written CSS per component**: rejected. It was the first version of the app shell. Every primitive (a collapsible sidebar with tooltips on its icon rail, an avatar with a fallback, accessible buttons with a visible focus) had to be written and kept accessible by hand, and each stylesheet grew its own breakpoints and colours.
- **A component library installed as a dependency (MUI, Mantine, Chakra)**: rejected. Its look and its runtime styling come with it and are hard to bend to the app's palette; shadcn/ui hands over the source, built on Radix for accessibility and Tailwind for styling.
- **The shared `packages/ui` workspace**: rejected for now. Only the frontend uses these components, and the shadcn CLI expects to write into the app it is run from.

## Consequences

- New runtime dependencies come with shadcn/ui: `radix-ui`, `class-variance-authority`, `cn` (class merging, a drop-in for `clsx` + `tailwind-merge`) and `tw-animate-css`. `tailwindcss`, `@tailwindcss/vite` and `shadcn` (pulled in only for its Tailwind stylesheet) are only needed at build time, so they are dev dependencies.
- Tailwind's preflight resets the browser's element styles (headings, buttons, links) for the whole app: the few places that relied on them restore what they need.
- The shadcn `Sidebar` is state-driven (open or collapsed), not driven by a media query. The icon rail on tablets (768–1024px) comes from `useSidebarOpen`, which reads `matchMedia` through `useSyncExternalStore` and feeds `SidebarProvider`'s `open` prop: the layout follows the viewport width alone, with no user-agent detection and no toggle to expand the rail.
- Generated files keep shadcn's own patterns, `useEffect` included, which our own code forbids. `apps/frontend/.oxlintrc.json` turns off `react/set-state-in-effect` and `react/only-export-components` for those files only. Running `shadcn add` again over an existing component overwrites it, so nothing of ours may live in those files.
- The `@/` import alias (to `apps/frontend/src`) exists for the generated files, which import each other through it.
