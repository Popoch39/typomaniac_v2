import { RANKED_CONNECT_MS } from "@repo/duel-engine";
import type { Logger } from "@repo/logger";
import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { Elysia, status } from "elysia";
import { websocket } from "elysia/websocket";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { createProtection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import { DUEL_EXPIRY_MS, readUnfinishedRankedDuel } from "../duel/service.ts";
import type { Lifecycle } from "../lifecycle/service.ts";
import { readStanding } from "../standing/service.ts";
import { createEvictions } from "./eviction.ts";
import * as QueueModel from "./model.ts";
import { createPairingFeed } from "./pairing.ts";
import {
  acceptPairingAsPlayer,
  createEntryRefreshes,
  enterQueue,
  type EntryHolder,
  leaveQueue,
  QUEUE_ENTRY_EXPIRY_MS,
  readQueueEntry,
} from "./service.ts";

export type QueueOptions = {
  readonly entryExpiryMs?: number;
  /** How often this instance refreshes the entries of its sockets; several times per expiry. */
  readonly refreshMs?: number;
  /** How long the ranked Duel of an accepted Pairing can be joined, as any Duel. */
  readonly duelExpiryMs?: number;
  /** How long the Players of that Duel have to connect before its first Countdown begins anyway. */
  readonly duelConnectMs?: number;
};

export const createQueueRoutes = (
  db: Db,
  auth: Auth,
  rateLimiter: RateLimiter,
  redis: Redis,
  logger: Logger,
  lifecycle: Lifecycle,
  {
    entryExpiryMs = QUEUE_ENTRY_EXPIRY_MS,
    refreshMs = entryExpiryMs / 3,
    duelExpiryMs = DUEL_EXPIRY_MS,
    duelConnectMs = RANKED_CONNECT_MS,
  }: QueueOptions = {},
) => {
  const evictions = createEvictions(redis);
  const pairings = createPairingFeed(db, redis, logger);
  const refreshes = createEntryRefreshes(redis, logger, {
    expiryMs: entryExpiryMs,
    intervalMs: refreshMs,
  });
  type Presence = EntryHolder & {
    readonly evict: () => void;
    readonly send: (message: QueueServerMessage) => void;
    readonly close: () => void;
  };
  // The Queue presence of each open socket, set on open and read on close.
  const present = new Map<string, Presence>();

  // One ranked Duel at a time: the Player is sent back to the one they are in.
  const refuseWhileInRankedDuel = async (playerId: string) => {
    const duelId = await readUnfinishedRankedDuel(redis, playerId);
    if (duelId !== null) return status(409, { code: "RANKED_DUEL_UNFINISHED", duelId });
  };

  return (
    new Elysia({ prefix: "/api/queue" })
      .use(createProtection(auth, rateLimiter))
      .use(websocket())
      // A stopped instance refreshes no entry any more, as if it had crashed.
      .onStop(refreshes.stop)
      // Lets a client tell why its upgrade was refused, which a browser WebSocket never shows.
      .get(
        "/",
        { nicknameChosen: true, response: QueueModel.RootGet.Response },
        async ({ player }) => {
          const refused = await refuseWhileInRankedDuel(player.id);
          if (refused) return refused;
          return { queuedAt: (await readQueueEntry(redis, player.id))?.queuedAt ?? null };
        },
      )
      .ws("/socket", {
        nicknameChosen: true,
        body: QueueModel.Socket.Body,
        response: QueueModel.Socket.Response,
        async beforeHandle({ body, player, set }) {
          // Also runs before each message, which carries a body: the upgrade alone is counted and
          // checked against the Duel.
          if (body !== undefined) return;
          const refused = await rateLimiter.check("queueSocket", player.id, set);
          if (refused) return refused;
          return refuseWhileInRankedDuel(player.id);
        },
        async open(ws) {
          if (!lifecycle.hold(ws.id, ws)) return;
          const send = (message: QueueServerMessage) => ws.send(message);
          const presence: Presence = {
            playerId: ws.player.id,
            connection: crypto.randomUUID(),
            evict: () => {
              send({ type: "removed", reason: "replaced" });
              ws.close();
            },
            send,
            close: () => ws.close(),
          };
          present.set(ws.id, presence);
          refreshes.hold(presence);
          await Promise.all([evictions.hold(presence), pairings.follow(presence)]);
          const { mmr } = await readStanding(db, presence.playerId);
          const queuedAt = await enterQueue(redis, presence, {
            mmr,
            now: Date.now(),
            expiryMs: entryExpiryMs,
          });
          // Closed while entering: its close found nothing to remove yet.
          if (!present.has(ws.id)) return leaveQueue(redis, presence);
          // A second tab or a reconnection: the socket that held the place until now is evicted.
          await evictions.takeOver(presence);
          send({ type: "queued", queuedAt, serverAt: Date.now() });
        },
        async message(ws, { pairingId }) {
          await acceptPairingAsPlayer(
            db,
            redis,
            { pairingId, playerId: ws.player.id },
            { now: Date.now(), duelExpiryMs, duelConnectMs },
          );
        },
        async close(ws) {
          lifecycle.release(ws.id);
          const presence = present.get(ws.id);
          if (!presence) return;
          present.delete(ws.id);
          refreshes.release(presence);
          await Promise.all([evictions.release(presence), pairings.unfollow(presence)]);
          await leaveQueue(redis, presence);
        },
      })
  );
};
