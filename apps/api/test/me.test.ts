import { afterAll, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { createApp } from "../src/app.ts";
import { createProtection } from "../src/protection.ts";
import { createTestAuth, signInJoueur } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";

const testDb = await createTestDb();
afterAll(() => testDb.drop());
const auth = createTestAuth(testDb.db);
const app = createApp(testDb.db, auth);

test("an Invité asking for their profile is told they are not signed in", async () => {
  const response = await app.handle(new Request("http://localhost/api/me"));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
});

test("a session cookie that Better Auth did not sign is refused", async () => {
  const { cookie } = await signInJoueur(auth);
  const [name, value] = cookie.split("=", 2);
  const token = value?.split(".")[0];

  for (const forged of [`${name}=${token}`, `${name}=${token}.forged`, `${name}=unknown.forged`]) {
    const response = await app.handle(
      new Request("http://localhost/api/me", { headers: { cookie: forged } }),
    );
    expect(response.status).toBe(401);
  }
});

test("a route protected by signedIn receives the Joueur and their session", async () => {
  const probe = new Elysia()
    .use(createProtection(auth))
    .get("/probe", { signedIn: true }, ({ joueur, session }) => ({
      joueurId: joueur.id,
      sessionJoueurId: session.userId,
    }));
  const { joueur, cookie } = await signInJoueur(auth);

  const response = await probe.handle(
    new Request("http://localhost/probe", { headers: { cookie } }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ joueurId: joueur.id, sessionJoueurId: joueur.id });
});

test("a Joueur with no Pseudo reads their own profile, without their email", async () => {
  const { joueur, cookie } = await signInJoueur(auth, { email: "ada@example.com" });

  const response = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie } }),
  );

  expect(response.status).toBe(200);
  expect(await response.clone().json()).toEqual({ id: joueur.id, pseudo: null });
  expect(await response.text()).not.toContain("ada@example.com");
});
