import type { QueueServerMessage } from "@repo/matchmaking-engine";
import type { Redis } from "../../redis/client.ts";
import { type PairingChange, pairingChannel } from "./service.ts";

type Follower = {
  readonly playerId: string;
  readonly send: (message: QueueServerMessage) => void;
  readonly close: () => void;
};

// Tells the Player's socket of the change, and closes it once the change takes them out of the Queue.
const deliver = (follower: Follower, change: PairingChange, now: number) => {
  const { send } = follower;
  if (change.type === "proposed") {
    const { pairingId, expiresAt } = change;
    return send({ type: "proposed", pairingId, acceptWithinMs: Math.max(0, expiresAt - now) });
  }
  if (change.type === "requeued")
    return send({ type: "requeued", queuedAt: change.queuedAt, serverAt: now });
  if (change.type === "removed") send({ type: "removed", reason: "notAccepted" });
  else send({ type: "paired", duelId: change.duelId });
  // Either way the Queue is left: for good, or for the Duel.
  follower.close();
};

/**
 * Hands the Pairing changes the matchmaker and the other API instances publish to the sockets this
 * instance holds. Each instance follows the channel while it holds a Queue socket.
 */
export const createPairingFeed = (redis: Redis) => {
  const local = new Set<Follower>();
  const channel = pairingChannel(redis);
  let following: Promise<unknown> | null = null;

  const listener = (raw: string) => {
    const change = JSON.parse(raw) as PairingChange;
    for (const follower of local) {
      if (follower.playerId === change.playerId) deliver(follower, change, Date.now());
    }
  };

  return {
    /** Resolves once this instance hears the changes, so that none is missed by the socket. */
    follow: async (follower: Follower) => {
      local.add(follower);
      following ??= redis.subscriber.subscribe(channel, listener);
      await following;
    },
    unfollow: async (follower: Follower) => {
      if (!local.delete(follower) || local.size > 0 || following === null) return;
      following = null;
      // Only this listener: another instance on the same connection may still follow the channel.
      await redis.subscriber.unsubscribe(channel, listener);
    },
  };
};
