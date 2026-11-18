# Type-aware lint with tsrs; the typecheck stays on `bun check -b`

oxlint runs with `options.typeAware` in the root `.oxlintrc.json`, so the `correctness` category also covers the rules that need type information (for example `require-array-sort-compare`). Its type-aware backend is `tsrs`, the Rust port of TypeScript 7, a root devDependency that oxlint finds and uses on its own. `options.typeCheck` stays off: `bun check -b` remains the only typecheck.

## Considered Options

- **`oxlint-tsgolint` as the backend**: rejected. Same diagnostics as `tsrs` on this repo, but slower (lint 0.35 s against 0.23 s, same peak memory of about 0.5 GB).
- **`options.typeCheck` in place of `bun check -b`**: rejected. oxlint checks each file in a single tsconfig program, while `bun check -b` checks it in every project that includes it. A file shared by `apps/frontend/tsconfig.app.json` (DOM) and `apps/frontend/test/tsconfig.json` (no DOM, Bun types) is therefore only checked with the DOM: a `document` access in `src/features/game/input` passes oxlint and fails `bun check -b`. All the other injected errors (one per project, plus `noUnusedLocals`) were reported by both.
- **`options.typeCheck` next to `bun check -b`**: rejected. Every type error would be reported twice, and `tsrs` checks with TypeScript 7.1 beta while the repo pins 7.0.2.

## Consequences

- `tsrs` is a beta (`0.25.0-ts7.1.0-beta`), pinned exactly. A version bump can change lint results: rerun `bun run lint` and compare.
- `bun run lint` now builds the TypeScript programs: about 0.25 s and 0.5 GB of peak memory instead of 0.04 s and 0.15 GB.
- A file outside every tsconfig `include` is still linted, with an inferred program that has no ambient types.
