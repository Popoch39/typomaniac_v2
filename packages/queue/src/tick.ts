import { type MatchmakingConfig, pairPlayers } from "@repo/matchmaking-engine";
import type { Redis } from "@repo/redis";
import { readWaitingPlayers } from "./entry.ts";
import { PAIRING_ACCEPT_MS, proposePairing, resolveExpiredPairings } from "./pairing.ts";

export type MatchmakerTickOptions = {
  /** How long the Players of a Pairing proposed by this tick have to accept it. */
  readonly acceptMs?: number;
  readonly config?: MatchmakingConfig;
};

/**
 * One pass of the matchmaker at `now`, in server time. It reads no clock, so a test drives it with
 * the instants it wants; every step it takes is atomic and idempotent, so two passes at once, from
 * two matchmakers, are harmless.
 */
export const tickMatchmaker = async (
  redis: Redis,
  now: number,
  { acceptMs = PAIRING_ACCEPT_MS, config }: MatchmakerTickOptions = {},
) => {
  // First, so that a Player queued again by this pass can be paired by it.
  await resolveExpiredPairings(redis, now);
  const waiting = await readWaitingPlayers(redis);
  for (const pair of pairPlayers(waiting, now, config))
    await proposePairing(redis, pair, now + acceptMs);
};
