import type { Redis } from "@repo/redis";

export const entryKey = (redis: Redis, playerId: string) => redis.name("queue", "entry", playerId);

/**
 * What a script puts before a Player id to name their entry. A script only learns some Player ids
 * by reading a Pairing or the waiting set, so it names those entries itself: Redis is not clustered.
 */
export const entryKeyPrefix = (redis: Redis) => entryKey(redis, "");

/** The Player ids of every entry, scored by instant of entry: what a snapshot of the Queue walks. */
export const waitingKey = (redis: Redis) => redis.name("queue", "waiting");

export const pairingKey = (redis: Redis, pairingId: string) =>
  redis.name("queue", "pairing", pairingId);

/** The ids of the Pairings awaiting acceptance, scored by the instant their time to accept ends. */
export const pendingPairingsKey = (redis: Redis) => redis.name("queue", "pairings");

/** The one channel on which Pairing changes are published to every API instance. */
export const pairingChannel = (redis: Redis) => redis.name("queue", "pairings", "channel");
