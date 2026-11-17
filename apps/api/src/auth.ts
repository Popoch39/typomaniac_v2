import { betterAuth, type ValidateUserInfoResult, type ValidateUserInfoSource } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "./db/client.ts";

type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

export type AuthConfig = {
  baseURL: string;
  secret: string;
  github: OAuthCredentials;
  discord: OAuthCredentials;
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
  github: {
    clientId: requireEnv(env, "GITHUB_CLIENT_ID"),
    clientSecret: requireEnv(env, "GITHUB_CLIENT_SECRET"),
  },
  discord: {
    clientId: requireEnv(env, "DISCORD_CLIENT_ID"),
    clientSecret: requireEnv(env, "DISCORD_CLIENT_SECRET"),
  },
});

// A Joueur is one email address: whoever gets a provider to present an address they do not own
// must never be created under it nor attached to the Joueur who owns it.
export const refuseUnverifiedEmail = ({
  user,
}: {
  user: { emailVerified?: boolean | undefined };
  source: ValidateUserInfoSource;
}): ValidateUserInfoResult | undefined =>
  user.emailVerified === true
    ? undefined
    : {
        error: "email_not_verified",
        errorDescription: "Verify your email address with the provider, then sign in again.",
      };

// Built from an injected database, like the app, so each test file gets an instance on its own database.
export const createAuth = (db: Db, config: AuthConfig) =>
  betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    baseURL: config.baseURL,
    secret: config.secret,
    // Front and API share one origin, with the API under /api.
    basePath: "/api/auth",
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    emailAndPassword: { enabled: false },
    socialProviders: {
      github: config.github,
      discord: config.discord,
    },
    user: { validateUserInfo: refuseUnverifiedEmail },
    account: {
      accountLinking: {
        // Trusting a provider makes Better Auth attach it without looking at emailVerified. It is only
        // safe because validateUserInfo runs before the attachment on every sign-in path, and it is
        // what lets that check answer with its own error instead of a generic "account not linked".
        trustedProviders: ["github", "discord"],
      },
    },
    // The one attachment path that skips validateUserInfo (linking by id token), and manual linking
    // is not offered anyway.
    disabledPaths: ["/link-social"],
  });

export type Auth = ReturnType<typeof createAuth>;
