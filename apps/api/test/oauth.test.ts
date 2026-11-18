import { afterAll, expect, setSystemTime, test } from "bun:test";
import { createApp } from "../src/app.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const app = createApp(testDb.db, createTestAuth(testDb.db), testRedis.redis);

type Identity = { id: string; email: string; verified: boolean };

// Stands in for GitHub and Discord: only their HTTP APIs are faked, the whole Better Auth flow runs for real.
let identity: Identity;
const fakeProviders = async (input: string | URL | Request) => {
  const url = input instanceof Request ? input.url : String(input);
  switch (decodeURIComponent(url)) {
    case "https://github.com/login/oauth/access_token":
    case "https://discord.com/api/oauth2/token":
      return Response.json({ access_token: "provider-token", token_type: "bearer" });
    case "https://api.github.com/user":
      return Response.json({ id: identity.id, login: "ada", email: null });
    case "https://api.github.com/user/emails":
      return Response.json([{ email: identity.email, primary: true, verified: identity.verified }]);
    case "https://discord.com/api/users/@me":
      return Response.json({
        id: identity.id,
        username: "ada",
        discriminator: "0",
        avatar: null,
        email: identity.email,
        verified: identity.verified,
      });
    default:
      throw new Error(`Unexpected outgoing request to ${url}`);
  }
};
const realFetch = globalThis.fetch;
globalThis.fetch = Object.assign(fakeProviders, { preconnect: realFetch.preconnect });

afterAll(async () => {
  globalThis.fetch = realFetch;
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
      {
        headers: { cookie: cookieHeader(start) },
      },
    ),
  );
  return {
    redirect: new URL(callback.headers.get("location") ?? "", "http://localhost"),
    cookie: cookieHeader(callback),
  };
};

const currentSession = async (cookie: string) => {
  const response = await app.handle(
    new Request("http://localhost/api/auth/get-session", { headers: { cookie } }),
  );
  return (await response.json()) as {
    user: { id: string; email: string };
    session: { expiresAt: string };
  } | null;
};

test("a Guest who signs in with GitHub becomes a Player with an open session", async () => {
  const signIn = await signInWith("github", {
    id: "1001",
    email: "ada@example.com",
    verified: true,
  });

  expect(signIn.redirect.pathname).toBe("/");
  expect(signIn.redirect.searchParams.get("error")).toBeNull();
  const session = await currentSession(signIn.cookie);
  expect(session?.user.email).toBe("ada@example.com");
});

test("GitHub and Discord presenting the same verified address open the same Player", async () => {
  const viaGithub = await signInWith("github", {
    id: "2001",
    email: "linus@example.com",
    verified: true,
  });
  const viaDiscord = await signInWith("discord", {
    id: "2002",
    email: "linus@example.com",
    verified: true,
  });

  const player = (await currentSession(viaGithub.cookie))?.user.id;
  expect(player).toBeString();
  expect((await currentSession(viaDiscord.cookie))?.user.id).toBe(player);
});

test("signing in is refused, saying why, when the provider has not verified the address", async () => {
  const signIn = await signInWith("discord", {
    id: "3001",
    email: "mallory@example.com",
    verified: false,
  });

  expect(signIn.redirect.pathname).toBe("/sign-in-error");
  expect(signIn.redirect.searchParams.get("error")).toBe("email_not_verified");
  expect(await currentSession(signIn.cookie)).toBeNull();
});

test("an unverified address cannot be attached to the Player who owns it", async () => {
  const owner = await signInWith("github", {
    id: "4001",
    email: "victim@example.com",
    verified: true,
  });
  const attacker = await signInWith("discord", {
    id: "4002",
    email: "victim@example.com",
    verified: false,
  });

  expect(attacker.redirect.pathname).toBe("/sign-in-error");
  expect(attacker.redirect.searchParams.get("error")).toBe("email_not_verified");
  expect(await currentSession(attacker.cookie)).toBeNull();
  expect((await currentSession(owner.cookie))?.user.email).toBe("victim@example.com");
});

const post = (path: string, body: unknown, cookie = "") =>
  app.handle(
    new Request(`http://localhost/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost", cookie },
      body: JSON.stringify(body),
    }),
  );

test("a Player whose address is no longer verified at the provider cannot sign in again", async () => {
  await signInWith("discord", { id: "6001", email: "alan@example.com", verified: true });
  const later = await signInWith("discord", {
    id: "6001",
    email: "alan@example.com",
    verified: false,
  });

  expect(later.redirect.searchParams.get("error")).toBe("email_not_verified");
  expect(await currentSession(later.cookie)).toBeNull();
});

test("a Player who signs out no longer has a session", async () => {
  const { cookie } = await signInWith("github", {
    id: "7001",
    email: "barbara@example.com",
    verified: true,
  });

  expect((await post("/sign-out", {}, cookie)).status).toBe(200);
  expect(await currentSession(cookie)).toBeNull();
});

test("attaching a provider by hand is not offered: it would skip the address check", async () => {
  const { cookie } = await signInWith("github", {
    id: "5001",
    email: "margaret@example.com",
    verified: true,
  });

  const response = await post("/link-social", { provider: "discord", callbackURL: "/" }, cookie);

  expect(response.status).toBe(404);
});

test("email and password sign-up and sign-in are closed", async () => {
  const credentials = { name: "Ada", email: "ada@example.com", password: "a-long-password-1234" };

  expect((await post("/sign-up/email", credentials)).status).toBe(400);
  expect((await post("/sign-in/email", credentials)).status).toBe(400);
});

test("sign-in is only offered through GitHub and Discord", async () => {
  const response = await post("/sign-in/social", { provider: "google", callbackURL: "/" });

  expect(response.status).toBe(404);
});

const DAY = 24 * 60 * 60 * 1000;
const daysLeft = (session: { session: { expiresAt: string } } | null) =>
  (new Date(session?.session.expiresAt ?? 0).getTime() - Date.now()) / DAY;

test("a session lasts 30 days and a visit pushes the deadline back at most once a day", async () => {
  const signedInAt = Date.now();
  try {
    const { cookie } = await signInWith("github", {
      id: "1002",
      email: "grace@example.com",
      verified: true,
    });
    expect(daysLeft(await currentSession(cookie))).toBeCloseTo(30, 2);

    setSystemTime(new Date(signedInAt + 0.5 * DAY));
    expect(daysLeft(await currentSession(cookie))).toBeCloseTo(29.5, 2);

    setSystemTime(new Date(signedInAt + 2 * DAY));
    expect(daysLeft(await currentSession(cookie))).toBeCloseTo(30, 2);
  } finally {
    setSystemTime();
  }
});
