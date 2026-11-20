import { expect } from "bun:test";
import { makeSignature } from "better-auth/crypto";
import type { Db } from "../../src/db/client.ts";
import { type Auth, type AuthRateLimit, createAuth } from "../../src/modules/auth/service.ts";

/** Where a banned Player of a test is told to write. */
export const TEST_APPEAL_ADDRESS = "appeal@typomaniac.test";

// Each test file builds its own instance on its own database, like the app it is injected into.
export const createTestAuth = (db: Db, rateLimit?: AuthRateLimit) =>
  createAuth(
    db,
    {
      baseURL: "http://localhost",
      secret: "test-secret-of-at-least-32-characters",
      github: { clientId: "test-github-id", clientSecret: "test-github-secret" },
      discord: { clientId: "test-discord-id", clientSecret: "test-discord-secret" },
      appealAddress: TEST_APPEAL_ADDRESS,
    },
    rateLimit,
  );

// A GitHub account old enough for ranked play, so the Queue opens to the Players of other tests.
const OLD_ENOUGH_FOR_RANKED = new Date("2020-01-01T00:00:00Z");

// Goes through Better Auth's internal adapter rather than its test-utils plugin: 1.7.25 only exports that plugin
// from the global "better-auth/plugins" entry, and it would have to sit in the production configuration.
export const signInPlayer = async (
  auth: Auth,
  {
    email,
    image,
    providerCreatedAt = OLD_ENOUGH_FOR_RANKED,
  }: { email?: string; image?: string; providerCreatedAt?: Date | null } = {},
) => {
  const { internalAdapter, authCookies, secret } = await auth.$context;
  // createUser runs the address check, which Better Auth only allows inside a request.
  // createOAuthUser's type leaves out the additional fields of the account, which it writes all the same.
  const providerAccount = {
    providerId: "github",
    accountId: crypto.randomUUID(),
    providerCreatedAt,
  };
  const { user: player } = await internalAdapter.createOAuthUser(
    // An empty provider username yields no default Nickname, so the Player starts without one.
    { name: "", email: email ?? `${crypto.randomUUID()}@example.com`, emailVerified: true, image },
    providerAccount,
  );
  const { token } = await internalAdapter.createSession(player.id);
  // Better Auth only accepts a session cookie signed with its secret.
  const cookie = `${authCookies.sessionToken.name}=${token}.${await makeSignature(token, secret)}`;
  return { player, cookie };
};

// A Player with a Nickname of their own, chosen as a Player does, through the app listening at `origin`.
export const signInPlayerWithNickname = async (
  auth: Auth,
  origin: string,
  { image }: { image?: string } = {},
) => {
  const { player, cookie } = await signInPlayer(auth, { image });
  const nickname = `p_${crypto.randomUUID().slice(0, 8)}`;
  const response = await fetch(`${origin}/api/me/nickname`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  expect(response.status).toBe(200);
  return { player, cookie, nickname };
};
