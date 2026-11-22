import type { Logger } from "@repo/logger";
import { Elysia } from "elysia";
import { websocket } from "elysia/websocket";
import type { Redis } from "../../redis/client.ts";
import type { Protection } from "../auth/index.ts";
import { logSocketFailure } from "../http/index.ts";
import { CloseCode } from "../lifecycle/closeCode.ts";
import type { Lifecycle } from "../lifecycle/service.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import { createPlayerChannels, type PlayerServerMessage } from "./channel.ts";
import * as OnlineModel from "./model.ts";
import { createOnlinePresence } from "./presence.ts";
import { ONLINE_WINDOW_MS } from "./service.ts";

export type OnlineOptions = {
  /** How long a Player stays Online after their sockets stopped being refreshed. */
  readonly windowMs?: number;
  /** How often this instance refreshes the Players of its sockets; several times per window. */
  readonly refreshMs?: number;
};

export const createOnlineRoutes = (
  protection: Protection,
  rateLimiter: RateLimiter,
  redis: Redis,
  logger: Logger,
  lifecycle: Lifecycle,
  { windowMs = ONLINE_WINDOW_MS, refreshMs = windowMs / 3 }: OnlineOptions = {},
) => {
  const presence = createOnlinePresence(redis, logger, { windowMs, intervalMs: refreshMs });
  const channels = createPlayerChannels(redis);
  type Holding = {
    readonly playerId: string;
    readonly send: (message: PlayerServerMessage) => void;
    readonly tellCount: (count: number) => void;
    readonly overCap: (now: number) => boolean;
  };
  // What each open socket holds, set on open and read on close.
  const holdings = new Map<string, Holding>();
  const closing = new Set<string>();

  return (
    new Elysia({ prefix: "/api/online" })
      .use(protection)
      .use(websocket())
      // A stopped instance refreshes no Player any more, as if it had crashed.
      .onStop(presence.stop)
      // One per tab of a signed-in Player, whose Nickname is not needed to be Online. Bun pings it at
      // the protocol level, which a browser answers even in a background tab.
      .ws("/socket", {
        signedIn: true,
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
        // No message is acted on yet: each one only counts toward the cap, in `parse`.
        message() {},
        async open(ws) {
          if (!lifecycle.hold(ws.id, ws)) return;
          const send = (message: PlayerServerMessage) => ws.send(message);
          const holding: Holding = {
            playerId: ws.player.id,
            send,
            tellCount: (count) => send({ type: "onlineCount", count }),
            overCap: rateLimiter.socketMessageWindow(),
          };
          holdings.set(ws.id, holding);
          logger.info("Player {playerId} opened a Player socket", { playerId: holding.playerId });
          await channels.hold(holding);
          // A close during the await found no presence to release: holding it now would keep the
          // Player Online until the instance stops.
          if (holdings.get(ws.id) !== holding) return;
          await presence.hold(holding);
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
          await Promise.all([channels.release(holding), presence.release(holding)]);
        },
        error: logSocketFailure(logger, "Player socket failed"),
      })
  );
};
