import type { Logger } from "@repo/logger";
import type { QueueServerMessage } from "@repo/matchmaking-engine";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { type PairingChange, pairingChannel, readPairingSides } from "./service.ts";

type Follower = {
  readonly playerId: string;
  readonly send: (message: QueueServerMessage) => void;
  readonly close: () => void;
};

// Tells the Player's socket of the change, and closes it once the change takes them out of the Queue.
const deliver = async (db: Db, redis: Redis, follower: Follower, change: PairingChange) => {
  const { send } = follower;
  if (change.type === "proposed") {
    const { pairingId, expiresAt, playerId } = change;
    const players = await readPairingSides(db, redis, { pairingId, playerId });
    // Only once the Pairing is resolved: both sides entered the Queue with a Nickname (`nicknameChosen`),
    // which is never cleared, nor is a Player deleted, so neither side can lack one. The change that
    // resolved it follows, and tells the Player what became of them.
    if (players === null) return;
    const acceptWithinMs = Math.max(0, expiresAt - Date.now());
    return send({ type: "proposed", pairingId, acceptWithinMs, players });
  }
  if (change.type === "requeued")
    return send({ type: "requeued", queuedAt: change.queuedAt, serverAt: Date.now() });
  if (change.type === "removed") send({ type: "removed", reason: "notAccepted" });
  else send({ type: "paired", duelId: change.duelId });
  // Either way the Queue is left: for good, or for the Duel.
  follower.close();
};

/**
 * Hands the Pairing changes the matchmaker and the other API instances publish to the sockets this
 * instance holds. Each instance follows the channel while it holds a Queue socket.
 */
export const createPairingFeed = (db: Db, redis: Redis, logger: Logger) => {
  const local = new Set<Follower>();
  // The last delivery to each socket: a proposal waits for its reads, and the changes that follow
  // it wait their turn, so that a socket gets them in the order they were published.
  const deliveries = new WeakMap<Follower, Promise<void>>();
  const channel = pairingChannel(redis);
  let following: Promise<unknown> | null = null;

  const listener = (raw: string) => {
    const change = JSON.parse(raw) as PairingChange;
    for (const follower of local) {
      if (follower.playerId !== change.playerId) continue;
      const delivered = (deliveries.get(follower) ?? Promise.resolve())
        .then(() => deliver(db, redis, follower, change))
        .catch((error: unknown) =>
          logger.error("Could not tell {playerId} of the Pairing change", {
            playerId: follower.playerId,
            error,
          }),
        );
      deliveries.set(follower, delivered);
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
