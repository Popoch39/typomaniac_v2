import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must come before the React plugin so the route tree is generated and code-split first.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    // `compiler` runs Oxc's Rust React Compiler (oxc-transform-react) instead of the Babel plugin.
    react({ compiler: true }),
  ],
});
