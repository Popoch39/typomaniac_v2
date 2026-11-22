import type { Seat, ServerMessage } from "@repo/duel-engine";
import type { Redis } from "../../redis/client.ts";

type Delivery = {
  readonly seat: Seat;
  /** The socket this delivery reaches, as held in the Duel by `holdSeat`. */
  readonly connection: string;
  readonly send: (message: ServerMessage) => void;
  /** Closes the socket, once another one has taken its seat back. */
  readonly evict: () => void;
};

/**
 * What travels on a Duel's channel: a message for the Participants other than `from`, or for all
 * when `null`; or a seat taken back by `connection`, whose other sockets must stop acting for it.
 */
type Published =
  | { readonly kind: "message"; readonly from: Seat | null; readonly message: ServerMessage }
  | { readonly kind: "takeover"; readonly seat: Seat; readonly connection: string };

/**
 * Carries messages between the Participants of a Duel through its Redis channel, so that two
 * sockets held by two API instances reach each other. Each instance subscribes to a Duel's
 * channel while it holds one of its sockets.
 */
export const createRelay = (redis: Redis) => {
  const deliveries = new Map<string, Set<Delivery>>();
  const listeners = new Map<string, (raw: string) => void>();
  const subscriptions = new Map<string, Promise<unknown>>();
  const channel = (duelId: string) => redis.name("duel", duelId, "channel");

  const deliver = (duelId: string) => (raw: string) => {
    const published = JSON.parse(raw) as Published;
    for (const delivery of deliveries.get(duelId) ?? []) {
      if (published.kind === "message") {
        if (delivery.seat !== published.from) delivery.send(published.message);
      } else if (delivery.seat === published.seat && delivery.connection !== published.connection) {
        delivery.evict();
      }
    }
  };

  const publish = async (duelId: string, published: Published) => {
    await redis.client.publish(channel(duelId), JSON.stringify(published));
  };

  return {
    /** Resolves once this instance hears the Duel's channel, so that no message is missed by the socket. */
    join: async (duelId: string, delivery: Delivery) => {
      const local = deliveries.get(duelId);
      if (local) {
        local.add(delivery);
      } else {
        deliveries.set(duelId, new Set([delivery]));
        const listener = deliver(duelId);
        listeners.set(duelId, listener);
        subscriptions.set(duelId, redis.subscriber.subscribe(channel(duelId), listener));
      }
      await subscriptions.get(duelId);
    },
    leave: async (duelId: string, delivery: Delivery) => {
      const local = deliveries.get(duelId);
      if (!local?.delete(delivery) || local.size > 0) return;
      deliveries.delete(duelId);
      const listener = listeners.get(duelId);
      listeners.delete(duelId);
      subscriptions.delete(duelId);
      // Only this relay's listener: another relay on the same connection may still follow the Duel.
      if (listener) await redis.subscriber.unsubscribe(channel(duelId), listener);
    },
    publish: (duelId: string, from: Seat | null, message: ServerMessage) =>
      publish(duelId, { kind: "message", from, message }),
    /** Evicts every socket of `seat` but `connection`, on whichever instance it is held. */
    takeOver: (duelId: string, seat: Seat, connection: string) =>
      publish(duelId, { kind: "takeover", seat, connection }),
  };
};

export type Relay = ReturnType<typeof createRelay>;
