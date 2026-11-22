import type { QueueRemovalReason } from "@repo/matchmaking-engine";
import type { Redis } from "../../redis/client.ts";
import { type EntryHolder, type QueueEviction, queueEvictionChannel } from "./service.ts";

type Presence = EntryHolder & {
  /** Tells the socket why it leaves the Queue and closes it. */
  readonly evict: (reason: QueueRemovalReason) => void;
};

/**
 * Keeps a Player to one socket in the Queue through a Redis channel, so that a socket opened on
 * one API instance evicts the one another instance holds; an accepted Challenge evicts them all. Each instance follows the channel while
 * it holds a Queue socket.
 */
export const createEvictions = (redis: Redis) => {
  const local = new Set<Presence>();
  const channel = queueEvictionChannel(redis);
  let following: Promise<unknown> | null = null;

  const listener = (raw: string) => {
    const eviction = JSON.parse(raw) as QueueEviction;
    for (const presence of local) {
      if (presence.playerId === eviction.playerId && presence.connection !== eviction.connection)
        presence.evict(eviction.reason);
    }
  };

  return {
    /** Resolves once this instance hears takeovers, so that none is missed by the socket. */
    hold: async (presence: Presence) => {
      local.add(presence);
      following ??= redis.subscriber.subscribe(channel, listener);
      await following;
    },
    release: async (presence: Presence) => {
      if (!local.delete(presence) || local.size > 0 || following === null) return;
      following = null;
      // Only this listener: another instance on the same connection may still follow the channel.
      await redis.subscriber.unsubscribe(channel, listener);
    },
    /** Evicts every socket of the Player but `connection`, on whichever instance it is held. */
    takeOver: async ({ playerId, connection }: EntryHolder) => {
      const eviction: QueueEviction = { playerId, connection, reason: "replaced" };
      await redis.client.publish(channel, JSON.stringify(eviction));
    },
  };
};
