import { makeSignature } from "better-auth/crypto";
import type { Db } from "../../src/db/client.ts";
import { type Auth, createAuth } from "../../src/modules/auth/service.ts";

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
export const signInPlayer = async (
  auth: Auth,
  { email, image }: { email?: string; image?: string } = {},
) => {
  const { internalAdapter, authCookies, secret } = await auth.$context;
  // createUser runs the address check, which Better Auth only allows inside a request.
  const { user: player } = await internalAdapter.createOAuthUser(
    // An empty provider username yields no default Nickname, so the Player starts without one.
    { name: "", email: email ?? `${crypto.randomUUID()}@example.com`, emailVerified: true, image },
    { providerId: "github", accountId: crypto.randomUUID() },
  );
  const { token } = await internalAdapter.createSession(player.id);
  // Better Auth only accepts a session cookie signed with its secret.
  const cookie = `${authCookies.sessionToken.name}=${token}.${await makeSignature(token, secret)}`;
  return { player, cookie };
};
