import { makeSignature } from "better-auth/crypto";
import type { Auth } from "../../src/auth.ts";
import { createAuth } from "../../src/auth.ts";
import type { Db } from "../../src/db/client.ts";

// Each test file builds its own instance on its own database, like the app it is injected into.
export const createTestAuth = (db: Db) =>
  createAuth(db, {
    baseURL: "http://localhost",
    secret: "test-secret-of-at-least-32-characters",
    github: { clientId: "test-github-id", clientSecret: "test-github-secret" },
    discord: { clientId: "test-discord-id", clientSecret: "test-discord-secret" },
  });

// Goes through Better Auth's internal adapter rather than its test-utils plugin: 1.7.25 only exports that plugin
// from the global "better-auth/plugins" entry, and it would have to sit in the production configuration.
export const signInJoueur = async (auth: Auth, { email }: { email?: string } = {}) => {
  const { internalAdapter, authCookies, secret } = await auth.$context;
  const joueur = await internalAdapter.createUser(
    { name: "Ada", email: email ?? `${crypto.randomUUID()}@example.com`, emailVerified: true },
    { method: "oauth", oauth: { providerId: "github" } },
  );
  const { token } = await internalAdapter.createSession(joueur.id);
  // Better Auth only accepts a session cookie signed with its secret.
  const cookie = `${authCookies.sessionToken.name}=${token}.${await makeSignature(token, secret)}`;
  return { joueur, cookie };
};
