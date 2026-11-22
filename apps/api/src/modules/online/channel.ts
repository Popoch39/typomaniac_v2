import type { Redis } from "../../redis/client.ts";
import {
  type PlayerPush,
  type PlayerServerMessage,
  playerChannel,
  pushToPlayer,
} from "./service.ts";

type Delivery = {
  readonly playerId: string;
  /** The socket's id, which a push may leave out. */
  readonly connection: string;
  readonly send: (message: PlayerServerMessage) => void;
};

/**
 * Reaches every Player socket of a Player, whichever API instance holds it, through a Redis channel
 * of the Player's own. An instance follows a Player's channel while it holds one of their sockets.
 */
export const createPlayerChannels = (redis: Redis) => {
  const local = new Map<string, Set<Delivery>>();
  const listeners = new Map<string, (raw: string) => void>();
  const channelOf = (playerId: string) => playerChannel(redis, playerId);

  return {
    /** Resolves once this instance hears what is pushed to the Player, so that the socket misses none. */
    hold: async (delivery: Delivery) => {
      const { playerId } = delivery;
      const deliveries = local.get(playerId);
      if (deliveries) return void deliveries.add(delivery);
      local.set(playerId, new Set([delivery]));
      const listener = (raw: string) => {
        const { message, except } = JSON.parse(raw) as PlayerPush;
        for (const held of local.get(playerId) ?? [])
          if (held.connection !== except) held.send(message);
      };
      listeners.set(playerId, listener);
      await redis.subscriber.subscribe(channelOf(playerId), listener);
    },
    release: async (delivery: Delivery) => {
      const { playerId } = delivery;
      const deliveries = local.get(playerId);
      if (!deliveries?.delete(delivery) || deliveries.size > 0) return;
      local.delete(playerId);
      const listener = listeners.get(playerId);
      listeners.delete(playerId);
      // Only this listener: another instance on the same connection may still follow the channel.
      if (listener) await redis.subscriber.unsubscribe(channelOf(playerId), listener);
    },
    /** Sends the message to every open socket of the Player, on any instance, but `except`. */
    push: (playerId: string, message: PlayerServerMessage, except: string | null = null) =>
      pushToPlayer(redis, playerId, message, except),
  };
};
