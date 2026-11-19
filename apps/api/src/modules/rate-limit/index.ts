import type { Logger } from "@repo/logger";
import { type Context, status, t } from "elysia";
import type { Redis } from "../../redis/client.ts";
import {
  consumeWindow,
  createMessageWindow,
  resolveClientIp,
  type SocketSource,
} from "./service.ts";

/** The body of every 429, for the `response` of a route that a limit guards. */
export const RateLimited = t.Object({ code: t.Literal("RATE_LIMITED") });

export type RateLimit = { readonly max: number; readonly windowSeconds: number };

export const RATE_LIMITS = {
  /** Nickname changes, per Player. */
  nickname: { max: 5, windowSeconds: 60 },
  /** Custom Duels created, per Participant. */
  duelPerParticipant: { max: 10, windowSeconds: 60 },
  /** Custom Duels created, per IP. */
  duelPerIp: { max: 30, windowSeconds: 60 },
  /** New Guest cookies issued, per IP: a Guest cookie costs nothing to replace. */
  guestPerIp: { max: 20, windowSeconds: 60 },
  /** Upgrades to a Duel socket, per Participant: reconnections pass, a reconnection loop does not. */
  duelSocket: { max: 20, windowSeconds: 60 },
  /** Upgrades to the Queue socket, per Player. */
  queueSocket: { max: 20, windowSeconds: 60 },
} as const satisfies Record<string, RateLimit>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/**
 * Messages on one Duel socket. Counted in memory on the instance that holds the socket rather than in
 * Redis: a socket lives on one instance, and a Redis round trip per keystroke would cost too much.
 */
export const SOCKET_MESSAGE_LIMIT: RateLimit = { max: 60, windowSeconds: 1 };

export type RateLimitOptions = {
  /** Reads the client IP from X-Forwarded-For rather than from the socket (TRUST_PROXY). */
  readonly trustProxy?: boolean;
  readonly limits?: Partial<Record<RateLimitName, RateLimit>>;
  readonly socketMessages?: RateLimit;
};

// Counted in Redis under the API's namespace, so a limit holds whichever instance a request reaches.
export const createRateLimiter = (
  redis: Redis,
  logger: Logger,
  { trustProxy = false, limits = {}, socketMessages = SOCKET_MESSAGE_LIMIT }: RateLimitOptions = {},
) => {
  const limitOf = (name: RateLimitName) => limits[name] ?? RATE_LIMITS[name];
  /**
   * The 429 every limit answers, Better Auth's included, with the seconds until the window ends;
   * each refusal is logged with the limit and the key it counted.
   */
  const refuse = (
    limit: RateLimitName | "auth",
    key: string | null,
    secondsLeft: number,
    set: Context["set"],
  ) => {
    logger.warn("Rate limit {limit} exceeded by {key}", { limit, key });
    set.headers["retry-after"] = String(Math.max(1, secondsLeft));
    return status(429, { code: "RATE_LIMITED" });
  };
  return {
    refuse,
    clientIp: (request: Request, server: SocketSource) =>
      resolveClientIp(request, server, trustProxy),
    /**
     * Counts one request against `key` under the named limit, and gives the 429 to answer once it
     * is over. A null key counts nothing: only a request handled in process has no IP.
     */
    check: async (name: RateLimitName, key: string | null, set: Context["set"]) => {
      if (key === null) return;
      const { max, windowSeconds } = limitOf(name);
      const { count, secondsLeft } = await consumeWindow(
        redis,
        redis.name("rate-limit", name, key),
        windowSeconds,
      );
      if (count <= max) return;
      return refuse(name, key, secondsLeft, set);
    },
    /** A counter of one socket's messages, which tells when a message goes over the cap. */
    socketMessageWindow: () =>
      createMessageWindow(socketMessages.max, socketMessages.windowSeconds * 1000),
  };
};

export type RateLimiter = ReturnType<typeof createRateLimiter>;
