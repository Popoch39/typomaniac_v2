# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Lint

Lint runs once for the whole monorepo, from the repo root: `bun run lint` (see `docs/adr/0001-oxc-and-bun-check-quality-toolchain.md` and `docs/adr/0005-type-aware-lint-with-tsrs-typecheck-stays-on-bun-check.md`). Type-aware rules come from `options.typeAware` in the root `.oxlintrc.json`, with the `tsrs` backend.

This app's `.oxlintrc.json` must keep `extends` on the root config: a nested oxlint config replaces the root one for its files instead of merging with it. It only adds `react/only-export-components`, for Fast Refresh.
