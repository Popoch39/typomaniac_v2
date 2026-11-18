import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { Elysia } from "elysia";
import { websocket } from "elysia/websocket";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { createProtection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import { readStanding } from "../standing/service.ts";
import { createEvictions } from "./eviction.ts";
import * as QueueModel from "./model.ts";
import {
  enterQueue,
  leaveQueue,
  QUEUE_ENTRY_EXPIRY_MS,
  readQueueEntry,
  refreshQueueEntry,
} from "./service.ts";

export type QueueOptions = {
  readonly entryExpiryMs?: number;
  /** How often this instance refreshes the entries of its sockets; several times per expiry. */
  readonly refreshMs?: number;
};

export const createQueueRoutes = (
  db: Db,
  auth: Auth,
  redis: Redis,
  { entryExpiryMs = QUEUE_ENTRY_EXPIRY_MS, refreshMs = entryExpiryMs / 3 }: QueueOptions = {},
) => {
  const evictions = createEvictions(redis);
  type Presence = Parameters<typeof evictions.hold>[0] & { readonly close: () => void };
  // The Queue presence of each open socket, set on open and read on close.
  const present = new Map<string, Presence>();

  // An entry lives only as long as it is refreshed: the entries of a crashed instance expire.
  let refreshing: ReturnType<typeof setInterval> | null = null;
  const refresh = async ({ playerId, connection, close }: Presence) => {
    // Lost to an expiry this instance did not prevent in time: the Player is told by the close.
    if (!(await refreshQueueEntry(redis, playerId, connection, entryExpiryMs))) close();
  };
  const refreshAll = () => {
    for (const presence of present.values())
      refresh(presence).catch((error: unknown) =>
        console.error(`Could not refresh the Queue entry of ${presence.playerId}`, error),
      );
  };
  const stopRefreshing = () => {
    if (refreshing !== null) clearInterval(refreshing);
    refreshing = null;
  };

  return (
    new Elysia({ prefix: "/api/queue" })
      .use(createProtection(auth))
      .use(websocket())
      // A stopped instance refreshes no entry any more, as if it had crashed.
      .onStop(stopRefreshing)
      // Lets a client tell why its upgrade was refused, which a browser WebSocket never shows.
      .get(
        "/",
        { nicknameChosen: true, response: QueueModel.RootGet.Response },
        async ({ player }) => ({
          queuedAt: (await readQueueEntry(redis, player.id))?.queuedAt ?? null,
        }),
      )
      .ws("/socket", {
        nicknameChosen: true,
        response: QueueModel.Socket.Response,
        async open(ws) {
          const send = (message: QueueServerMessage) => ws.send(message);
          const playerId = ws.player.id;
          const connection = crypto.randomUUID();
          const presence: Presence = {
            playerId,
            connection,
            evict: () => {
              send({ type: "removed", reason: "replaced" });
              ws.close();
            },
            close: () => ws.close(),
          };
          present.set(ws.id, presence);
          refreshing ??= setInterval(refreshAll, refreshMs);
          await evictions.hold(presence);
          const { mmr } = await readStanding(db, playerId);
          const queuedAt = await enterQueue(redis, playerId, {
            mmr,
            connection,
            now: Date.now(),
            expiryMs: entryExpiryMs,
          });
          // Closed while entering: its close found nothing to remove yet.
          if (!present.has(ws.id)) return leaveQueue(redis, playerId, connection);
          // A second tab or a reconnection: the socket that held the place until now is evicted.
          await evictions.takeOver(playerId, connection);
          send({ type: "queued", queuedAt, serverAt: Date.now() });
        },
        async close(ws) {
          const presence = present.get(ws.id);
          if (!presence) return;
          present.delete(ws.id);
          if (present.size === 0) stopRefreshing();
          await evictions.release(presence);
          await leaveQueue(redis, presence.playerId, presence.connection);
        },
      })
  );
};
