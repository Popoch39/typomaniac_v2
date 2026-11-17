import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "./db/client.ts";

export type AuthConfig = {
  baseURL: string;
  secret: string;
};

const requireEnv = (env: Record<string, string | undefined>, name: string) => {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set: see apps/api/.env.example`);
  return value;
};

// Checked at startup so a missing secret stops the boot instead of failing the first sign-in.
export const requireAuthConfig = (
  env: Record<string, string | undefined> = process.env,
): AuthConfig => ({
  secret: requireEnv(env, "BETTER_AUTH_SECRET"),
  baseURL: requireEnv(env, "BETTER_AUTH_URL"),
});

// Built from an injected database, like the app, so each test file gets an instance on its own database.
export const createAuth = (db: Db, config: AuthConfig) =>
  betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    baseURL: config.baseURL,
    secret: config.secret,
    // Front and API share one origin, with the API under /api.
    basePath: "/api/auth",
  });

export type Auth = ReturnType<typeof createAuth>;
