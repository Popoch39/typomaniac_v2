import { describe, expect, test } from "bun:test";
import { refuseUnverifiedEmail, requireAuthConfig } from "../src/auth.ts";

const completeEnv = {
  BETTER_AUTH_SECRET: "a-secret-of-at-least-32-characters",
  BETTER_AUTH_URL: "https://typomaniac.example",
  GITHUB_CLIENT_ID: "github-id",
  GITHUB_CLIENT_SECRET: "github-secret",
  DISCORD_CLIENT_ID: "discord-id",
  DISCORD_CLIENT_SECRET: "discord-secret",
};

test("auth configuration is read from the environment", () => {
  expect(requireAuthConfig(completeEnv)).toEqual({
    secret: "a-secret-of-at-least-32-characters",
    baseURL: "https://typomaniac.example",
    github: { clientId: "github-id", clientSecret: "github-secret" },
    discord: { clientId: "discord-id", clientSecret: "discord-secret" },
  });
});

test.each([
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
] as const)(
  "startup is refused with a message naming %s when it is missing",
  (name) => {
    expect(() => requireAuthConfig({ ...completeEnv, [name]: undefined })).toThrow(name);
    expect(() => requireAuthConfig({ ...completeEnv, [name]: "" })).toThrow(name);
  },
);

describe.each(["create-user", "link-account", "sign-in"] as const)(
  "the address check, on %s",
  (action) => {
    const fromProvider = (emailVerified: boolean | undefined) => ({
      user: { email: "ada@example.com", emailVerified },
      source: { action, method: "oauth", oauth: { providerId: "discord" } },
    });

    test("lets a verified address through", () => {
      expect(refuseUnverifiedEmail(fromProvider(true))).toBeUndefined();
    });

    test.each([false, undefined])("refuses when the provider reports verified = %p", (verified) => {
      expect(refuseUnverifiedEmail(fromProvider(verified))?.error).toBe("email_not_verified");
    });
  },
);

