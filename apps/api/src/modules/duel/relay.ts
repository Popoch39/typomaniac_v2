import type { Seat, ServerMessage } from "@repo/duel-engine";
import type { Redis } from "../../redis/client.ts";

type Delivery = { readonly seat: Seat; readonly send: (message: ServerMessage) => void };

/** What travels on a Duel's channel: a message for the Participants other than `from`, or for all when `null`. */
type Published = { readonly from: Seat | null; readonly message: ServerMessage };

/**
 * Carries messages between the Participants of a Duel through its Redis channel, so that two
 * sockets held by two API instances reach each other. Each instance subscribes to a Duel's
 * channel while it holds one of its sockets.
 */
export const createRelay = (redis: Redis) => {
  const deliveries = new Map<string, Set<Delivery>>();
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
      await redis.subscriber.subscribe(channel(duelId), deliver(duelId));
    },
    leave: async (duelId: string, delivery: Delivery) => {
      const local = deliveries.get(duelId);
      if (!local?.delete(delivery) || local.size > 0) return;
      deliveries.delete(duelId);
      await redis.subscriber.unsubscribe(channel(duelId));
    },
    publish: async (duelId: string, from: Seat | null, message: ServerMessage) => {
      const published: Published = { from, message };
      await redis.client.publish(channel(duelId), JSON.stringify(published));
    },
  };
};
