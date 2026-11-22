import type { Logger } from "@repo/logger";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { duelPlayersChannel } from "../duel/service.ts";
import { readFriendIds } from "../friend/service.ts";
import { onlineWindowNow, type PlayerServerMessage, readPlayerStates } from "./service.ts";

type Watcher = {
  readonly playerId: string;
  readonly send: (message: PlayerServerMessage) => void;
};

/**
 * Tells the Player sockets of this instance the state of their Player's Friends: all of them on
 * opening, then each change. A Player whose state may have changed is announced on a channel that
 * every instance holding a watching socket follows, this module's or the Duel module's; each instance reads the state of the Players its
 * own sockets watch, so that a state is only ever told to the Player's Friends.
 */
export const createFriendWatch = (
  db: Db,
  redis: Redis,
  logger: Logger,
  { windowMs }: { readonly windowMs: number },
) => {
  const friendsOf = new Map<Watcher, Set<string>>();
  const watchersOf = new Map<string, Set<Watcher>>();
  // What a socket is told before the states of its Friends, sent right after them, so that no
  // change read later is overtaken by the states read earlier.
  const queued = new Map<Watcher, PlayerServerMessage[]>();
  const channel = redis.name("online", "changed");
  const channels = [channel, duelPlayersChannel(redis)];
  let following: Promise<unknown> | null = null;

  const tell = (watcher: Watcher, message: PlayerServerMessage) => {
    const waiting = queued.get(watcher);
    if (waiting) waiting.push(message);
    else watcher.send(message);
  };
  const watch = (watcher: Watcher, friendId: string) => {
    friendsOf.get(watcher)?.add(friendId);
    const watchers = watchersOf.get(friendId);
    if (watchers) watchers.add(watcher);
    else watchersOf.set(friendId, new Set([watcher]));
  };
  const unwatch = (watcher: Watcher, friendId: string) => {
    friendsOf.get(watcher)?.delete(friendId);
    const watchers = watchersOf.get(friendId);
    if (!watchers?.delete(watcher) || watchers.size > 0) return;
    watchersOf.delete(friendId);
  };
  const tellStates = async (playerIds: readonly string[]) => {
    const watched = playerIds.filter((playerId) => watchersOf.has(playerId));
    const states = await readPlayerStates(redis, watched, onlineWindowNow(windowMs));
    for (const [playerId, state] of states)
      for (const watcher of watchersOf.get(playerId) ?? [])
        tell(watcher, { type: "friendState", playerId, state });
  };
  const tellStatesLogged = (playerIds: readonly string[]) =>
    void tellStates(playerIds).catch((error: unknown) =>
      logger.error("Could not tell the state of Players {playerIds}", { playerIds, error }),
    );
  const listener = (raw: string) => tellStatesLogged(JSON.parse(raw) as string[]);

  return {
    /** Tells the socket the state of each Friend, once it hears every change that follows. */
    hold: async (watcher: Watcher) => {
      friendsOf.set(watcher, new Set());
      queued.set(watcher, []);
      following ??= Promise.all(
        channels.map((followed) => redis.subscriber.subscribe(followed, listener)),
      );
      await following;
      const friendIds = await readFriendIds(db, watcher.playerId);
      for (const friendId of friendIds) watch(watcher, friendId);
      const states = await readPlayerStates(redis, friendIds, onlineWindowNow(windowMs));
      const waiting = queued.get(watcher) ?? [];
      queued.delete(watcher);
      // Closed meanwhile.
      if (!friendsOf.has(watcher)) return;
      watcher.send({
        type: "friendStates",
        friends: [...states].map(([playerId, state]) => ({ playerId, state })),
      });
      for (const message of waiting) watcher.send(message);
    },
    release: async (watcher: Watcher) => {
      for (const friendId of friendsOf.get(watcher) ?? []) unwatch(watcher, friendId);
      queued.delete(watcher);
      if (!friendsOf.delete(watcher) || friendsOf.size > 0 || following === null) return;
      following = null;
      // Only this listener: another instance on the same connection may still follow the channel.
      await Promise.all(
        channels.map((followed) => redis.subscriber.unsubscribe(followed, listener)),
      );
    },
    /**
     * Hands the socket a message pushed to its Player, and follows the Friends it adds or removes:
     * a new Friend's state is told right after, a removed one's no longer.
     */
    deliver: (watcher: Watcher, message: PlayerServerMessage) => {
      if (!friendsOf.has(watcher)) return watcher.send(message);
      if (message.type === "friendRemoved") unwatch(watcher, message.playerId);
      if (message.type === "friendRequestAccepted") watch(watcher, message.playerId);
      tell(watcher, message);
      if (message.type === "friendRequestAccepted") tellStatesLogged([message.playerId]);
    },
    /** The Players whose state this instance's sockets follow. */
    watchedIds: () => [...watchersOf.keys()],
    /** Tells the sockets of this instance that follow these Players that they are no longer Friends. */
    forget: (playerIds: readonly string[]) => {
      for (const playerId of playerIds)
        for (const watcher of watchersOf.get(playerId) ?? []) {
          unwatch(watcher, playerId);
          tell(watcher, { type: "friendRemoved", playerId });
        }
    },
    /** Tells the Friends of these Players, on every instance, the state each of them is in now. */
    announce: async (playerIds: readonly string[]) => {
      if (playerIds.length > 0) await redis.client.publish(channel, JSON.stringify(playerIds));
    },
  };
};
