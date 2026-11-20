import { afterAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { account } from "../src/db/client.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const app = createApp(
  testDb.db,
  createTestAuth(testDb.db),
  testRedis.redis,
  getLogger("api"),
).listen(0);
const origin = `http://localhost:${app.server?.port}`;

const DAY_MS = 24 * 60 * 60 * 1000;
// Discord's identifiers count milliseconds from its epoch in their upper bits.
const DISCORD_EPOCH_MS = 1_420_070_400_000;
const discordIdAt = (ms: number) => String(BigInt(ms - DISCORD_EPOCH_MS) << 22n);
// Second-precise, as GitHub gives it.
const daysAgo = (days: number) => Math.floor((Date.now() - days * DAY_MS) / 1000) * 1000;

type Identity = { id: string; email: string; createdAt?: number };

// Stands in for GitHub and Discord: only their HTTP APIs are faked, the whole Better Auth flow runs for real.
let identity: Identity;
const fakeProviders = async (input: string | URL | Request, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input);
  switch (decodeURIComponent(url)) {
    case "https://github.com/login/oauth/access_token":
    case "https://discord.com/api/oauth2/token":
      return Response.json({ access_token: "provider-token", token_type: "bearer" });
    case "https://api.github.com/user":
      return Response.json({
        id: identity.id,
        login: `gh_${identity.id}`,
        email: null,
        created_at: new Date(identity.createdAt ?? 0).toISOString().replace(".000Z", "Z"),
      });
    case "https://api.github.com/user/emails":
      return Response.json([{ email: identity.email, primary: true, verified: true }]);
    case "https://discord.com/api/users/@me":
      return Response.json({
        id: identity.id,
        username: `dc_${identity.id.slice(-8)}`,
        global_name: null,
        discriminator: "0",
        avatar: null,
        email: identity.email,
        verified: true,
      });
    default:
      return realFetch(input, init);
  }
};
const realFetch = globalThis.fetch;
globalThis.fetch = Object.assign(fakeProviders, { preconnect: realFetch.preconnect });

afterAll(async () => {
  globalThis.fetch = realFetch;
  await app.stop(true);
  await testRedis.drop();
  await testDb.drop();
});

const cookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.slice(0, cookie.indexOf(";")))
    .join("; ");

// Plays the browser's part: start the sign-in, come back from the provider with a code.
const signInWith = async (provider: "github" | "discord", as: Identity) => {
  identity = as;
  const start = await app.handle(
    new Request("http://localhost/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, callbackURL: "/", errorCallbackURL: "/sign-in-error" }),
    }),
  );
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get("state");
  const callback = await app.handle(
    new Request(
      `http://localhost/api/auth/callback/${provider}?code=provider-code&state=${state}`,
      { headers: { cookie: cookieHeader(start) } },
    ),
  );
  expect(callback.headers.get("location")).toBe("/");
  return cookieHeader(callback);
};

const uniqueEmail = () => `${crypto.randomUUID()}@example.com`;
const uniqueGithubId = () => String(Math.floor(Math.random() * 1e12));

const readQueue = async (cookie: string) => {
  const response = await fetch(`${origin}/api/queue`, { headers: { cookie } });
  return { status: response.status, body: await response.json() };
};
const upgradeQueue = async (cookie: string) => {
  const response = await requestUpgrade(
    `${origin.replace(/^http/, "ws")}/api/queue/socket`,
    cookie,
  );
  return { status: response.status, body: await response.json() };
};

test("the Queue is closed to a Player whose only GitHub account is younger than 7 days, saying when ranked opens", async () => {
  const createdAt = daysAgo(3);
  const cookie = await signInWith("github", {
    id: uniqueGithubId(),
    email: uniqueEmail(),
    createdAt,
  });

  const refusal = { code: "ACCOUNT_TOO_YOUNG", opensAt: createdAt + 7 * DAY_MS };
  expect(await readQueue(cookie)).toEqual({ status: 403, body: refusal });
  expect(await upgradeQueue(cookie)).toEqual({ status: 403, body: refusal });
});

test("the age of a Discord account is the instant its identifier encodes", async () => {
  const createdAt = Date.now() - 2 * DAY_MS;
  const cookie = await signInWith("discord", { id: discordIdAt(createdAt), email: uniqueEmail() });

  expect(await readQueue(cookie)).toEqual({
    status: 403,
    body: { code: "ACCOUNT_TOO_YOUNG", opensAt: createdAt + 7 * DAY_MS },
  });
});

test("a Player whose GitHub or Discord account is older than 7 days may queue", async () => {
  const viaGithub = await signInWith("github", {
    id: uniqueGithubId(),
    email: uniqueEmail(),
    createdAt: daysAgo(8),
  });
  // Discord's documentation example, created on 2016-04-30.
  const viaDiscord = await signInWith("discord", {
    id: "175928847299117063",
    email: uniqueEmail(),
  });

  expect(await readQueue(viaGithub)).toEqual({ status: 200, body: { queuedAt: null } });
  expect(await readQueue(viaDiscord)).toEqual({ status: 200, body: { queuedAt: null } });
});

test("a Player with one young and one old linked account may queue", async () => {
  const email = uniqueEmail();
  await signInWith("discord", { id: discordIdAt(Date.now() - 30 * DAY_MS), email });
  const cookie = await signInWith("github", {
    id: uniqueGithubId(),
    email,
    createdAt: daysAgo(1),
  });

  expect(await readQueue(cookie)).toEqual({ status: 200, body: { queuedAt: null } });
});

test("a Player whose account age is not recorded is refused until they sign in again", async () => {
  const signedUp = { id: uniqueGithubId(), email: uniqueEmail(), createdAt: daysAgo(400) };
  const cookie = await signInWith("github", signedUp);
  // As for a Player who signed in before the age was recorded.
  await testDb.db
    .update(account)
    .set({ providerCreatedAt: null })
    .where(eq(account.accountId, signedUp.id));

  expect(await readQueue(cookie)).toEqual({
    status: 403,
    body: { code: "ACCOUNT_AGE_UNKNOWN" },
  });
  expect(await upgradeQueue(cookie)).toEqual({
    status: 403,
    body: { code: "ACCOUNT_AGE_UNKNOWN" },
  });

  const again = await signInWith("github", signedUp);
  expect(await readQueue(again)).toEqual({ status: 200, body: { queuedAt: null } });
});

test("a Player too young for ranked can still create a Custom Duel", async () => {
  const cookie = await signInWith("github", {
    id: uniqueGithubId(),
    email: uniqueEmail(),
    createdAt: daysAgo(1),
  });

  const created = await fetch(`${origin}/api/duels`, { method: "POST", headers: { cookie } });
  expect(created.status).toBe(201);
});
