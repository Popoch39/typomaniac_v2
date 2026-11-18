import type { Redis } from "../../redis/client.ts";

type Presence = {
  readonly playerId: string;
  /** The socket this presence stands for, as named in the Player's Queue entry. */
  readonly connection: string;
  /** Tells the socket it was replaced and closes it. */
  readonly evict: () => void;
};

/** What travels on the channel: the Player's place in the Queue was taken over by `connection`. */
type Published = { readonly playerId: string; readonly connection: string };

/**
 * Keeps a Player to one socket in the Queue through a Redis channel, so that a socket opened on
 * one API instance evicts the one another instance holds. Each instance follows the channel while
 * it holds a Queue socket.
 */
export const createEvictions = (redis: Redis) => {
  const local = new Set<Presence>();
  const channel = redis.name("queue", "evictions");
  let following: Promise<unknown> | null = null;

  const listener = (raw: string) => {
    const published = JSON.parse(raw) as Published;
    for (const presence of local) {
      if (presence.playerId === published.playerId && presence.connection !== published.connection)
        presence.evict();
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
    takeOver: async (playerId: string, connection: string) => {
      const published: Published = { playerId, connection };
      await redis.client.publish(channel, JSON.stringify(published));
    },
  };
};
