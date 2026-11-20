import {
  betterAuth,
  type BetterAuthRateLimitOptions,
  type ValidateUserInfoResult,
  type ValidateUserInfoSource,
} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { assignDefaultNickname } from "../player/service.ts";
import { createRedisRateLimitStorage } from "../rate-limit/service.ts";
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

// Discord identifiers count milliseconds from this instant in their upper bits.
const DISCORD_EPOCH_MS = 1_420_070_400_000;

/**
 * When the provider made the account, as it gives it: GitHub in its profile, Discord in the
 * identifier; `null` for any other provider or a profile without it.
 */
export const providerCreatedAtOf = (
  providerId: string,
  profile: Record<string, unknown> | undefined,
): Date | null => {
  const createdAt = profile?.created_at;
  if (providerId === "github" && typeof createdAt === "string") {
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const id = profile?.id;
  if (providerId === "discord" && typeof id === "string" && /^\d+$/.test(id)) {
    return new Date(Number(BigInt(id) >> 22n) + DISCORD_EPOCH_MS);
  }
  return null;
};

// Better Auth reads the client IP from headers only. The API resolves it as for its own limits
// (socket address, or X-Forwarded-For behind TRUST_PROXY) and hands it over in this header, which
// it always overwrites so a client can never set it.
export const CLIENT_IP_HEADER = "x-typomaniac-client-ip";

// enabled left out keeps Better Auth's default: on in production only.
export type AuthRateLimit = { redis: Redis } & Pick<
  BetterAuthRateLimitOptions,
  "enabled" | "customRules"
>;

// Built from an injected database, like the app, so each test file gets an instance on its own
// database. Without a rate limit, Better Auth's is off: its in-memory count would not hold across
// instances.
export const createAuth = (db: Db, config: AuthConfig, rateLimit?: AuthRateLimit) => {
  // Only validateUserInfo sees the raw provider profile, and only the account hooks write the
  // account: the creation date is held from one to the other for the sign-in request that read it.
  const providerCreatedAts = new WeakMap<object, { providerId: string; createdAt: Date }>();
  const withProviderCreatedAt = <Account extends { providerId?: string }>(
    account: Account,
    request: object | null,
  ) => {
    const found = request === null ? undefined : providerCreatedAts.get(request);
    return found === undefined || found.providerId !== account.providerId
      ? undefined
      : { data: { ...account, providerCreatedAt: found.createdAt } };
  };

  return betterAuth({
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
      // Recorded at each sign-in, so a Player who signed in before it was recorded gets it by
      // signing in again.
      account: {
        create: { before: async (account, request) => withProviderCreatedAt(account, request) },
        update: { before: async (account, request) => withProviderCreatedAt(account, request) },
      },
    },
    user: {
      validateUserInfo: (info, request) => {
        const { oauth } = info.source;
        const createdAt = oauth ? providerCreatedAtOf(oauth.providerId, oauth.profile) : null;
        if (oauth && createdAt !== null) {
          providerCreatedAts.set(request, { providerId: oauth.providerId, createdAt });
        }
        return refuseUnverifiedEmail(info);
      },
      additionalFields: {
        // input: false keeps Better Auth's own routes from setting it: only PUT /api/me/nickname applies the Nickname rules.
        nickname: { type: "string", required: false, input: false },
      },
    },
    account: {
      additionalFields: {
        // input: false: only the provider's own profile, read at sign-in, sets it.
        providerCreatedAt: { type: "date", required: false, input: false },
      },
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
    advanced: { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } },
    rateLimit: rateLimit
      ? {
          enabled: rateLimit.enabled,
          customRules: rateLimit.customRules,
          customStorage: createRedisRateLimitStorage(rateLimit.redis),
        }
      : { enabled: false },
  });
};

export type Auth = ReturnType<typeof createAuth>;
