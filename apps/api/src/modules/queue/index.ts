import { RANKED_CONNECT_MS } from "@repo/duel-engine";
import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { Elysia } from "elysia";
import { websocket } from "elysia/websocket";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { createProtection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import { draftRankedDuel, DUEL_EXPIRY_MS, readUnfinishedRankedDuel } from "../duel/service.ts";
import { readNicknames } from "../player/service.ts";
import { readStanding } from "../standing/service.ts";
import { createEvictions } from "./eviction.ts";
import * as QueueModel from "./model.ts";
import { createPairingFeed } from "./pairing.ts";
import {
  acceptPairing,
  enterQueue,
  leaveQueue,
  QUEUE_ENTRY_EXPIRY_MS,
  readPairing,
  readQueueEntry,
  refreshQueueEntry,
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
  redis: Redis,
  {
    entryExpiryMs = QUEUE_ENTRY_EXPIRY_MS,
    refreshMs = entryExpiryMs / 3,
    duelExpiryMs = DUEL_EXPIRY_MS,
    duelConnectMs = RANKED_CONNECT_MS,
  }: QueueOptions = {},
) => {
  const evictions = createEvictions(redis);
  const pairings = createPairingFeed(redis);
  type Presence = Parameters<typeof evictions.hold>[0] &
    Parameters<typeof pairings.follow>[0] & { readonly close: () => void };
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
        async ({ player, status }) => {
          const duelId = await readUnfinishedRankedDuel(redis, player.id);
          if (duelId !== null) return status(409, { code: "RANKED_DUEL_UNFINISHED", duelId });
          return { queuedAt: (await readQueueEntry(redis, player.id))?.queuedAt ?? null };
        },
      )
      .ws("/socket", {
        nicknameChosen: true,
        body: QueueModel.Socket.Body,
        response: QueueModel.Socket.Response,
        async beforeHandle({ body, player, status }) {
          // Also runs before each message, which carries a body: the Duel is checked on the upgrade.
          if (body !== undefined) return;
          // One ranked Duel at a time: the Player is sent back to the one they are in.
          const duelId = await readUnfinishedRankedDuel(redis, player.id);
          if (duelId !== null) return status(409, { code: "RANKED_DUEL_UNFINISHED", duelId });
        },
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
            deliver: (change) => {
              if (change.type === "proposed") {
                const { pairingId, expiresAt } = change;
                const acceptWithinMs = Math.max(0, expiresAt - Date.now());
                return send({ type: "proposed", pairingId, acceptWithinMs });
              }
              if (change.type === "requeued")
                return send({ type: "requeued", queuedAt: change.queuedAt, serverAt: Date.now() });
              if (change.type === "removed") send({ type: "removed", reason: "notAccepted" });
              else send({ type: "paired", duelId: change.duelId });
              // Either way the Queue is left: for good, or for the Duel.
              ws.close();
            },
          };
          present.set(ws.id, presence);
          refreshing ??= setInterval(refreshAll, refreshMs);
          await Promise.all([evictions.hold(presence), pairings.follow(presence)]);
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
        async message(ws, { pairingId }) {
          const pairing = await readPairing(redis, pairingId);
          if (!pairing) return;
          // Read ahead of the step that may create the Duel, which shows each Player by Nickname and
          // by Rank as they stand now.
          const nicknames = await readNicknames(db, pairing.playerIds);
          const [first, second] = await Promise.all(
            pairing.playerIds.map(async (playerId) => ({
              playerId,
              nickname: nicknames.get(playerId),
              rank: (await readStanding(db, playerId)).rank,
            })),
          );
          if (first?.nickname === undefined || second?.nickname === undefined) return;
          // Both Players learn the outcome from the Pairing channel, whichever instance holds them.
          await acceptPairing(redis, pairingId, ws.player.id, {
            now: Date.now(),
            creation: draftRankedDuel(
              redis,
              [
                { ...first, nickname: first.nickname },
                { ...second, nickname: second.nickname },
              ],
              { expiryMs: duelExpiryMs, connectMs: duelConnectMs },
            ),
          });
        },
        async close(ws) {
          const presence = present.get(ws.id);
          if (!presence) return;
          present.delete(ws.id);
          if (present.size === 0) stopRefreshing();
          await Promise.all([evictions.release(presence), pairings.unfollow(presence)]);
          await leaveQueue(redis, presence.playerId, presence.connection);
        },
      })
  );
};
