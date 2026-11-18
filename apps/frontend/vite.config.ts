import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
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
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Front and API share one origin, as in production: the API, its WebSocket included, answers under /api.
  server: {
    proxy: { "/api": { target: "http://localhost:3000", ws: true } },
  },
});
