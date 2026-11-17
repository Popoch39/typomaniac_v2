import { afterAll, expect, test } from "bun:test";
import { requireAuthConfig } from "../src/auth.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";

const testDb = await createTestDb();
afterAll(() => testDb.drop());
const auth = createTestAuth(testDb.db);

const completeEnv = {
  BETTER_AUTH_SECRET: "a-secret-of-at-least-32-characters",
  BETTER_AUTH_URL: "https://typomaniac.example",
};

test("auth configuration is read from the environment", () => {
  expect(requireAuthConfig(completeEnv)).toEqual({
    secret: "a-secret-of-at-least-32-characters",
    baseURL: "https://typomaniac.example",
  });
});

test.each(["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"] as const)(
  "startup is refused with a message naming %s when it is missing",
  (name) => {
    expect(() => requireAuthConfig({ ...completeEnv, [name]: undefined })).toThrow(name);
    expect(() => requireAuthConfig({ ...completeEnv, [name]: "" })).toThrow(name);
  },
);

test("a Joueur and their session are stored and read back through Better Auth", async () => {
  const { internalAdapter } = await auth.$context;

  const joueur = await internalAdapter.createUser(
    { name: "Ada", email: "ada@example.com", emailVerified: true },
    { method: "oauth", oauth: { providerId: "github" } },
  );
  const session = await internalAdapter.createSession(joueur.id);

  const found = await internalAdapter.findSession(session.token);
  expect(found?.session.id).toBe(session.id);
  expect(found?.session.expiresAt).toBeInstanceOf(Date);
  expect(found?.user).toMatchObject({
    id: joueur.id,
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
  });
});
