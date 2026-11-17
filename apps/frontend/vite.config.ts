import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // `compiler` runs Oxc's Rust React Compiler (oxc-transform-react) instead of the Babel plugin.
  plugins: [react({ compiler: true })],
});
