import { defineConfig } from "drizzle-kit";

// Not imported from src/db/client.ts: drizzle-kit loads this file under Node, where the `bun` module does not exist.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set: copy apps/api/.env.example to apps/api/.env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
