import type { Redis } from "../../redis/client.ts";
import { type PairingChange, pairingChannel } from "./service.ts";

type Follower = {
  readonly playerId: string;
  /** Handed each Pairing change that concerns the Player. */
  readonly deliver: (change: PairingChange) => void;
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
      if (follower.playerId === change.playerId) follower.deliver(change);
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
