import { betterAuth, type ValidateUserInfoResult, type ValidateUserInfoSource } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "../../db/client.ts";
import { assignDefaultNickname } from "../player/service.ts";
import type { AuthConfig } from "./config.ts";

// A Player is one email address: whoever gets a provider to present an address they do not own
// must never be created under it nor attached to the Player who owns it.
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
    // name carries the provider username, not the display name it holds by default (often a real
    // name on GitHub, any characters on Discord): the default Nickname is derived from it.
    socialProviders: {
      github: { ...config.github, mapProfileToUser: (profile) => ({ name: profile.login }) },
      discord: { ...config.discord, mapProfileToUser: (profile) => ({ name: profile.username }) },
    },
    databaseHooks: {
      user: {
        create: {
          // Runs once the Player is committed, so the unique index judges the Nickname like any other write.
          after: async (player) => {
            await assignDefaultNickname(db, player.id, player.name);
          },
        },
      },
    },
    user: {
      validateUserInfo: refuseUnverifiedEmail,
      additionalFields: {
        // input: false keeps Better Auth's own routes from setting it: only PUT /api/me/nickname applies the Nickname rules.
        nickname: { type: "string", required: false, input: false },
      },
    },
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
