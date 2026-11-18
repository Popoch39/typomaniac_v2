import type { Seat, ServerMessage } from "@repo/duel-engine";
import type { Redis } from "../../redis/client.ts";

type Delivery = { readonly seat: Seat; readonly send: (message: ServerMessage) => void };

/** What travels on a Duel's channel: a message for the Participants other than `from`. */
type Published = { readonly from: Seat; readonly message: ServerMessage };

/**
 * Carries messages between the Participants of a Duel through its Redis channel, so that two
 * sockets held by two API instances reach each other. Each instance subscribes to a Duel's
 * channel while it holds one of its sockets.
 */
export const createRelay = (redis: Redis) => {
  const deliveries = new Map<string, Set<Delivery>>();
  const listeners = new Map<string, (raw: string) => void>();
  const channel = (duelId: string) => redis.name("duel", duelId, "channel");

  const deliver = (duelId: string) => (raw: string) => {
    const { from, message } = JSON.parse(raw) as Published;
    for (const delivery of deliveries.get(duelId) ?? []) {
      if (delivery.seat !== from) delivery.send(message);
    }
  };

  return {
    join: async (duelId: string, delivery: Delivery) => {
      const local = deliveries.get(duelId);
      if (local) {
        local.add(delivery);
        return;
      }
      deliveries.set(duelId, new Set([delivery]));
      const listener = deliver(duelId);
      listeners.set(duelId, listener);
      await redis.subscriber.subscribe(channel(duelId), listener);
    },
    leave: async (duelId: string, delivery: Delivery) => {
      const local = deliveries.get(duelId);
      if (!local?.delete(delivery) || local.size > 0) return;
      deliveries.delete(duelId);
      const listener = listeners.get(duelId);
      listeners.delete(duelId);
      // Only this relay's listener: another relay on the same connection may still follow the Duel.
      if (listener) await redis.subscriber.unsubscribe(channel(duelId), listener);
    },
    publish: async (duelId: string, from: Seat, message: ServerMessage) => {
      const published: Published = { from, message };
      await redis.client.publish(channel(duelId), JSON.stringify(published));
    },
  };
};
