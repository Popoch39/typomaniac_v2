import { defineConfig } from "drizzle-kit";

// Not imported from @repo/db: drizzle-kit loads this file under Node, where the `bun` module does not exist.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set: copy apps/api/.env.example to apps/api/.env");

export default defineConfig({
  dialect: "postgresql",
  // The schema is shared with the fair-play worker; the migrations stay here, as the API applies them (ADR 0002).
  schema: "../../packages/db/src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
