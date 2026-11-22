import type { Logger } from "@repo/logger";
import { Elysia } from "elysia";
import { websocket } from "elysia/websocket";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import type { Protection } from "../auth/index.ts";
import { logSocketFailure } from "../http/index.ts";
import { CloseCode } from "../lifecycle/closeCode.ts";
import type { Lifecycle } from "../lifecycle/service.ts";
import { DUEL_EXPIRY_MS } from "../duel/service.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import { createChallenges } from "./challenge.ts";
import { createPlayerChannels } from "./channel.ts";
import { createFriendWatch } from "./friendWatch.ts";
import * as OnlineModel from "./model.ts";
import { createOnlinePresence } from "./presence.ts";
import { CHALLENGE_EXPIRY_MS, ONLINE_WINDOW_MS, type PlayerServerMessage } from "./service.ts";

export type OnlineOptions = {
  /** How long a Player stays Online after their sockets stopped being refreshed. */
  readonly windowMs?: number;
  /** How often this instance refreshes the Players of its sockets; several times per window. */
  readonly refreshMs?: number;
  /** How long a challenged Player has to answer. */
  readonly challengeExpiryMs?: number;
  /** How long the Custom Duel of an accepted Challenge can be joined, as any Custom Duel. */
  readonly duelExpiryMs?: number;
};

export const createOnlineRoutes = (
  db: Db,
  protection: Protection,
  rateLimiter: RateLimiter,
  redis: Redis,
  logger: Logger,
  lifecycle: Lifecycle,
  {
    windowMs = ONLINE_WINDOW_MS,
    refreshMs = windowMs / 3,
    challengeExpiryMs = CHALLENGE_EXPIRY_MS,
    duelExpiryMs = DUEL_EXPIRY_MS,
  }: OnlineOptions = {},
) => {
  const friendWatch = createFriendWatch(db, redis, logger, { windowMs });
  const challenges = createChallenges(db, redis, logger, rateLimiter, {
    expiryMs: challengeExpiryMs,
    windowMs,
    duelExpiryMs,
  });
  const presence = createOnlinePresence(redis, logger, {
    windowMs,
    intervalMs: refreshMs,
    changed: async (playerIds) => {
      await Promise.all([friendWatch.announce(playerIds), challenges.whenChanged(playerIds)]);
    },
  });
  const channels = createPlayerChannels(redis);
  type Holding = {
    readonly playerId: string;
    readonly send: (message: PlayerServerMessage) => void;
    readonly tellCount: (count: number) => void;
    readonly overCap: (now: number) => boolean;
    /** Whether the Player has a Nickname, without which they have no Friend. */
    readonly befriendable: boolean;
    /** What the Player's channel hands this socket. */
    readonly delivery: {
      readonly playerId: string;
      readonly connection: string;
      readonly send: (message: PlayerServerMessage) => void;
    };
  };
  // What each open socket holds, set on open and read on close.
  const holdings = new Map<string, Holding>();
  const closing = new Set<string>();

  return (
    new Elysia({ prefix: "/api/online" })
      .use(protection)
      .use(websocket())
      .onStart(challenges.start)
      // A stopped instance refreshes no Player any more, as if it had crashed.
      .onStop(async () => {
        presence.stop();
        await challenges.stop();
      })
      // One per tab of a signed-in Player, whose Nickname is not needed to be Online. Bun pings it at
      // the protocol level, which a browser answers even in a background tab.
      .ws("/socket", {
        signedIn: true,
        body: OnlineModel.Socket.Body,
        response: OnlineModel.Socket.Response,
        async beforeHandle({ body, player, set }) {
          // Also runs before each message, which carries a body: the upgrade alone is counted.
          if (body !== undefined) return;
          return rateLimiter.check("playerSocket", player.id, set);
        },
        // Runs on every message before anything else reads it, so that any message counts.
        parse(ws) {
          const holding = holdings.get(ws.id);
          if (!holding || closing.has(ws.id) || !holding.overCap(Date.now())) return;
          closing.add(ws.id);
          logger.warn("Player socket of {key} closed for flooding", {
            limit: "socketMessages",
            key: holding.playerId,
          });
          ws.close(CloseCode.policyViolation, "message rate exceeded");
        },
        async message(ws, body) {
          if (closing.has(ws.id)) return;
          const tab = {
            playerId: ws.player.id,
            connection: ws.id,
            send: (message: PlayerServerMessage) => ws.send(message),
          };
          // Nothing is returned: Elysia would send it back as a message.
          switch (body.type) {
            case "challenge":
              await challenges.challenge(tab, body.playerId);
              break;
            case "cancelChallenge":
              await challenges.cancel(tab, body.challengeId);
              break;
            case "acceptChallenge":
              await challenges.accept(tab, body.challengeId);
              break;
            case "declineChallenge":
              await challenges.decline(tab, body.challengeId);
              break;
          }
        },
        async open(ws) {
          if (!lifecycle.hold(ws.id, ws)) return;
          const send = (message: PlayerServerMessage) => ws.send(message);
          const playerId = ws.player.id;
          const holding: Holding = {
            playerId,
            send,
            tellCount: (count) => send({ type: "onlineCount", count }),
            overCap: rateLimiter.socketMessageWindow(),
            befriendable: ws.player.nickname !== null,
            delivery: {
              playerId,
              connection: ws.id,
              send: (message) => friendWatch.deliver(holding, message),
            },
          };
          holdings.set(ws.id, holding);
          logger.info("Player {playerId} opened a Player socket", { playerId: holding.playerId });
          await channels.hold(holding.delivery);
          await presence.hold(holding);
          if (holding.befriendable) await friendWatch.hold(holding);
        },
        async close(ws, code) {
          lifecycle.release(ws.id);
          closing.delete(ws.id);
          logger.info("Player {playerId} closed a Player socket ({code})", {
            playerId: ws.player.id,
            code,
          });
          const holding = holdings.get(ws.id);
          if (!holding) return;
          holdings.delete(ws.id);
          await Promise.all([
            channels.release(holding.delivery),
            presence.release(holding),
            friendWatch.release(holding),
            challenges.release({ playerId: holding.playerId, connection: ws.id }),
          ]);
        },
        error: logSocketFailure(logger, "Player socket failed"),
      })
  );
};
