import type { Logger } from "@repo/logger";
import type { Redis } from "../../redis/client.ts";
import { refreshOnline } from "./service.ts";

type Holder = {
  readonly playerId: string;
  /** Sends the Online count to the socket. */
  readonly tellCount: (count: number) => void;
};

/**
 * Keeps the Players of this instance's sockets Online and their sockets told the Online count. Each
 * instance refreshes its own Players every `intervalMs` while it holds a socket; a count that changed,
 * found by any instance, is published on one channel that every instance holding a socket follows.
 */
export const createOnlinePresence = (
  redis: Redis,
  logger: Logger,
  {
    windowMs,
    intervalMs,
    changed,
  }: {
    readonly windowMs: number;
    readonly intervalMs: number;
    /** Told the Players who came Online or left, as a refresh found them. */
    readonly changed: (playerIds: readonly string[]) => Promise<void>;
  },
) => {
  const held = new Set<Holder>();
  // The last count each socket was sent, so that none is told the same count twice.
  const sent = new WeakMap<Holder, number>();
  const channel = redis.name("online", "count");
  // The last count heard on the channel: a count found equal to it changed nothing.
  let known: number | null = null;
  let following: Promise<unknown> | null = null;
  let refreshing: ReturnType<typeof setInterval> | null = null;

  const tell = (holder: Holder, count: number) => {
    if (sent.get(holder) === count) return;
    sent.set(holder, count);
    holder.tellCount(count);
  };
  const listener = (raw: string) => {
    known = Number(raw);
    for (const holder of held) tell(holder, known);
  };
  const announce = async (count: number) => {
    if (count !== known) await redis.client.publish(channel, String(count));
  };
  const refreshAll = async () => {
    const playerIds = new Set([...held].map(({ playerId }) => playerId));
    const refreshed = await refreshOnline(redis, playerIds, { now: Date.now(), windowMs });
    await Promise.all([announce(refreshed.count), changed(refreshed.changed)]);
  };
  const stop = () => {
    if (refreshing !== null) clearInterval(refreshing);
    refreshing = null;
  };

  return {
    /** Marks the socket's Player Online and tells the socket the count, once it hears every change. */
    hold: async (holder: Holder) => {
      held.add(holder);
      following ??= redis.subscriber.subscribe(channel, listener);
      await following;
      refreshing ??= setInterval(
        () =>
          void refreshAll().catch((error: unknown) =>
            logger.error("Could not refresh the Online Players", { error }),
          ),
        intervalMs,
      );
      const { count, changed: found } = await refreshOnline(redis, [holder.playerId], {
        now: Date.now(),
        windowMs,
      });
      if (held.has(holder)) tell(holder, count);
      await Promise.all([announce(count), changed(found)]);
    },
    /** Stops refreshing for the socket; its Player leaves the count once no socket refreshes them. */
    release: async (holder: Holder) => {
      if (!held.delete(holder) || held.size > 0) return;
      stop();
      if (following === null) return;
      following = null;
      known = null;
      // Only this listener: another instance on the same connection may still follow the channel.
      await redis.subscriber.unsubscribe(channel, listener);
    },
    /** Refreshes no Player any more, as if this instance had crashed. */
    stop,
  };
};
