import { RANKED_CONNECT_MS } from "@repo/duel-engine";
import type { Logger } from "@repo/logger";
import type { QueueRemovalReason, QueueServerMessage } from "@repo/matchmaking-engine";
import { Elysia, status } from "elysia";
import { websocket } from "elysia/websocket";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { type Protection } from "../auth/index.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import { DUEL_EXPIRY_MS, readUnfinishedRankedDuel } from "../duel/service.ts";
import { readCurrentSuspension } from "../fair-play/service.ts";
import { mayReconnect } from "../lifecycle/closeCode.ts";
import { logSocketFailure } from "../http/index.ts";
import type { Lifecycle } from "../lifecycle/service.ts";
import { createSocketPhases } from "../lifecycle/socketPhase.ts";
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
  readEntryPairingId,
  readQueueEntry,
  readRankedOpensAt,
  refreshQueueEntry,
} from "./service.ts";

export type QueueOptions = {
  /** How long an entry outlives its last refresh, and a socket that dropped: its time to be reclaimed. */
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
  protection: Protection,
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
    readonly evict: (reason: QueueRemovalReason) => void;
    readonly send: (message: QueueServerMessage) => void;
    readonly close: () => void;
  };
  // The Queue presence of each open socket, set on open and read on close.
  const present = new Map<string, Presence>();
  const phases = createSocketPhases();

  // One ranked Duel at a time: the Player is sent back to the one they are in.
  const refuseWhileInRankedDuel = async (playerId: string) => {
    const duelId = await readUnfinishedRankedDuel(redis, playerId);
    if (duelId !== null) return status(409, { code: "RANKED_DUEL_UNFINISHED", duelId });
  };
  // A suspended Player is told until when; the Queue opens again by itself at that instant.
  const refuseWhileSuspended = async (playerId: string) => {
    const suspension = await readCurrentSuspension(db, playerId, new Date());
    if (suspension) return status(403, { code: "RANKED_SUSPENDED", endsAt: suspension.endsAt });
  };
  // A throwaway account must cost time before it plays ranked (ADR 0014).
  const refuseBeforeRankedOpens = async (playerId: string) => {
    const opensAt = await readRankedOpensAt(db, playerId);
    if (opensAt === null) return status(403, { code: "ACCOUNT_AGE_UNKNOWN" });
    if (opensAt > Date.now()) return status(403, { code: "ACCOUNT_TOO_YOUNG", opensAt });
  };
  const refuseQueue = async (playerId: string) =>
    (await refuseWhileInRankedDuel(playerId)) ??
    (await refuseWhileSuspended(playerId)) ??
    (await refuseBeforeRankedOpens(playerId));

  return (
    new Elysia({ prefix: "/api/queue" })
      .use(protection)
      .use(websocket())
      // A stopped instance refreshes no entry any more, as if it had crashed.
      .onStop(refreshes.stop)
      // Lets a client tell why its upgrade was refused, which a browser WebSocket never shows.
      .get(
        "/",
        { nicknameChosen: true, response: QueueModel.RootGet.Response },
        async ({ player }) => {
          const refused = await refuseQueue(player.id);
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
          // checked against the Duel, the Suspension and the account's age.
          if (body !== undefined) return;
          const refused = await rateLimiter.check("queueSocket", player.id, set);
          if (refused) return refused;
          return refuseQueue(player.id);
        },
        async open(ws) {
          if (!lifecycle.hold(ws.id, ws)) return;
          await phases.opening(ws.id, async (closed) => {
            const send = (message: QueueServerMessage) => ws.send(message);
            const presence: Presence = {
              playerId: ws.player.id,
              connection: crypto.randomUUID(),
              evict: (reason) => {
                send({ type: "removed", reason });
                ws.close();
              },
              send,
              close: () => ws.close(),
            };
            present.set(ws.id, presence);
            logger.info("Player {playerId} opened a Queue socket", { playerId: presence.playerId });
            // Closed while opening: what the open took is let go of here, its close having left it.
            const abandon = async () => {
              present.delete(ws.id);
              refreshes.release(presence);
              await Promise.all([evictions.release(presence), pairings.unfollow(presence)]);
              await leaveQueue(redis, presence);
            };
            refreshes.hold(presence);
            await Promise.all([evictions.hold(presence), pairings.follow(presence)]);
            if (closed()) return await abandon();
            const { mmr } = await readStanding(db, presence.playerId);
            if (closed()) return await abandon();
            const queuedAt = await enterQueue(redis, presence, {
              mmr,
              now: Date.now(),
              expiryMs: entryExpiryMs,
            });
            if (closed()) return await abandon();
            // A second tab or a reconnection: the socket that held the place until now is evicted.
            await evictions.takeOver(presence);
            if (closed()) return await abandon();
            // A reconnection during a Pairing: the Player must still be able to accept it, or to see
            // that they already did, instead of being shown a waiting Queue.
            const pairingId = await readEntryPairingId(redis, presence.playerId);
            if (closed()) return await abandon();
            if (pairingId === null) send({ type: "queued", queuedAt, serverAt: Date.now() });
            else pairings.repropose(presence, pairingId);
          });
        },
        async message(ws, { pairingId }) {
          await acceptPairingAsPlayer(
            db,
            redis,
            { pairingId, playerId: ws.player.id },
            { now: Date.now(), duelExpiryMs, duelConnectMs },
          );
        },
        async close(ws, code) {
          lifecycle.release(ws.id);
          logger.info("Player {playerId} closed their Queue socket ({code})", {
            playerId: ws.player.id,
            code,
          });
          await phases.closing(ws.id, async () => {
            const presence = present.get(ws.id);
            if (!presence) return;
            present.delete(ws.id);
            refreshes.release(presence);
            await Promise.all([evictions.release(presence), pairings.unfollow(presence)]);
            // A drop or a restart is followed by a reconnection, which reclaims the entry with its
            // instant of entry and its Pairing: it is kept for a full expiry, then expires unclaimed.
            if (mayReconnect(code)) await refreshQueueEntry(redis, presence, entryExpiryMs);
            else await leaveQueue(redis, presence);
          });
        },
        error: logSocketFailure(logger, "Queue socket failed"),
      })
  );
};
