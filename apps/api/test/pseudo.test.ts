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

const choosePseudo = (pseudo: unknown, cookie?: string) =>
  app.handle(
    new Request("http://localhost/api/me/pseudo", {
      method: "PUT",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ pseudo }),
    }),
  );

const readProfile = async (cookie: string) => {
  const response = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie } }),
  );
  return response.json();
};

test("a Joueur chooses their Pseudo and reads it back with the case they typed", async () => {
  const { joueur, cookie } = await signInJoueur(auth);

  const response = await choosePseudo("Ada_Lovelace-1815", cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: joueur.id, pseudo: "Ada_Lovelace-1815" });
  expect(await readProfile(cookie)).toEqual({ id: joueur.id, pseudo: "Ada_Lovelace-1815" });
});

test("an Invité choosing a Pseudo is told they are not signed in", async () => {
  const response = await choosePseudo("Grace");

  expect(response.status).toBe(401);
});

test.each([
  ["shorter than 3 characters", "ab"],
  ["longer than 20 characters", "a".repeat(21)],
  ["with a space", "ada lovelace"],
  ["with an accented letter", "adélaïde"],
  ["with a dot", "ada.lovelace"],
  ["ending with a line break", "adalovelace\n"],
  ["that is not a string", 12345],
  ["that is missing", undefined],
])("a Pseudo %s is refused and leaves the Joueur without Pseudo", async (_rule, pseudo) => {
  const { joueur, cookie } = await signInJoueur(auth);

  const response = await choosePseudo(pseudo, cookie);

  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ code: "PSEUDO_INVALID" });
  expect(await readProfile(cookie)).toEqual({ id: joueur.id, pseudo: null });
});

test("a badly formatted Pseudo gets the same answer in production", async () => {
  const { cookie } = await signInJoueur(auth);
  const nodeEnv = process.env.NODE_ENV;
  // Elysia strips its default validation responses under this value, which the prod image sets.
  process.env.NODE_ENV = "production";
  try {
    const response = await choosePseudo("ab", cookie);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: "PSEUDO_INVALID" });
  } finally {
    process.env.NODE_ENV = nodeEnv;
  }
});

test("a Pseudo of exactly 3 or 20 characters is accepted", async () => {
  for (const pseudo of ["a-1", "B".repeat(20)]) {
    const { cookie } = await signInJoueur(auth);

    expect((await choosePseudo(pseudo, cookie)).status).toBe(200);
  }
});

test.each(["admin", "Admin", "TYPOMANIAC", "Invite", "nUlL", "mod"])(
  "the reserved Pseudo %s is refused",
  async (pseudo) => {
    const { joueur, cookie } = await signInJoueur(auth);

    const response = await choosePseudo(pseudo, cookie);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: "PSEUDO_RESERVED" });
    expect(await readProfile(cookie)).toEqual({ id: joueur.id, pseudo: null });
  },
);

test("a Pseudo already taken by another Joueur is refused, whatever the case", async () => {
  const first = await signInJoueur(auth);
  const second = await signInJoueur(auth);
  await choosePseudo("Hopper", first.cookie);

  for (const pseudo of ["Hopper", "hopper", "HOPPER"]) {
    const response = await choosePseudo(pseudo, second.cookie);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "PSEUDO_TAKEN" });
  }
  expect(await readProfile(second.cookie)).toEqual({ id: second.joueur.id, pseudo: null });
  expect(await readProfile(first.cookie)).toEqual({ id: first.joueur.id, pseudo: "Hopper" });
});

test("two Joueurs choosing the same Pseudo at the same time: exactly one gets it", async () => {
  const first = await signInJoueur(auth);
  const second = await signInJoueur(auth);

  const responses = await Promise.all([
    choosePseudo("Turing", first.cookie),
    choosePseudo("turing", second.cookie),
  ]);

  expect(responses.map((response) => response.status).toSorted()).toEqual([200, 409]);
});

test("a Joueur changes their Pseudo, which frees the old one for another Joueur", async () => {
  const first = await signInJoueur(auth);
  const second = await signInJoueur(auth);
  await choosePseudo("Lamarr", first.cookie);

  const changed = await choosePseudo("Hedy", first.cookie);

  expect(changed.status).toBe(200);
  expect(await readProfile(first.cookie)).toEqual({ id: first.joueur.id, pseudo: "Hedy" });
  const taken = await choosePseudo("lamarr", second.cookie);
  expect(taken.status).toBe(200);
  expect(await readProfile(second.cookie)).toEqual({ id: second.joueur.id, pseudo: "lamarr" });
});

test("a Joueur takes their own Pseudo again with another case", async () => {
  const { joueur, cookie } = await signInJoueur(auth);
  await choosePseudo("johnson", cookie);

  const response = await choosePseudo("JohnSon", cookie);

  expect(response.status).toBe(200);
  expect(await readProfile(cookie)).toEqual({ id: joueur.id, pseudo: "JohnSon" });
});

test("Better Auth's own routes cannot set the Pseudo", async () => {
  const { joueur, cookie } = await signInJoueur(auth);

  const response = await app.handle(
    new Request("http://localhost/api/auth/update-user", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost", cookie },
      body: JSON.stringify({ pseudo: "admin" }),
    }),
  );

  expect(response.status).toBe(400);
  expect(await readProfile(cookie)).toEqual({ id: joueur.id, pseudo: null });
});

const probe = new Elysia()
  .use(createProtection(auth))
  .get("/probe", { pseudoChosen: true }, ({ joueur }) => ({
    id: joueur.id,
    shout: joueur.pseudo.toUpperCase(),
  }));

const callProbe = (cookie?: string) =>
  probe.handle(new Request("http://localhost/probe", { headers: cookie ? { cookie } : {} }));

test("a route protected by pseudoChosen tells an Invité they are not signed in", async () => {
  const response = await callProbe();

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
});

test("a route protected by pseudoChosen tells a Joueur without Pseudo to choose one", async () => {
  const { cookie } = await signInJoueur(auth);

  const response = await callProbe(cookie);

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ code: "PSEUDO_REQUIRED" });
});

test("a route protected by pseudoChosen receives the Joueur and their Pseudo", async () => {
  const { joueur, cookie } = await signInJoueur(auth);
  await choosePseudo("Borg", cookie);

  const response = await callProbe(cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: joueur.id, shout: "BORG" });
});
