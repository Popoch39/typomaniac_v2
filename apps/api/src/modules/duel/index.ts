import {
  COUNTDOWN_MS,
  DUEL_GAME_CONFIG,
  type Participant,
  type ServerMessage,
} from "@repo/duel-engine";
import { applyEvent, createGame, type Game } from "@repo/typing-engine";
import { Elysia } from "elysia";
import { websocket } from "elysia/websocket";
import type { Redis } from "../../redis/client.ts";
import { createProtection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import * as DuelModel from "./model.ts";
import { createRelay } from "./relay.ts";
import {
  announceStart,
  appendEvent,
  claimSeat,
  createDuel,
  DUEL_EXPIRY_MS,
  isEventAccepted,
  readDuel,
  readJournals,
  releaseSeat,
} from "./service.ts";

export type DuelOptions = { readonly expiryMs?: number; readonly countdownMs?: number };

export const createDuelRoutes = (
  auth: Auth,
  redis: Redis,
  { expiryMs = DUEL_EXPIRY_MS, countdownMs = COUNTDOWN_MS }: DuelOptions = {},
) => {
  const relay = createRelay(redis);
  type Seating = {
    participant: Participant;
    delivery: Parameters<typeof relay.join>[1];
    /** The Start this socket was told of, in server time, whichever instance announced it. */
    startAt: number | null;
    /** This instance's copy of the Participant's Game, rebuilt from its journal on opening. */
    game: Game;
  };
  // What each open socket is seated as, set on open and read on messages and on close.
  const seated = new Map<string, Seating>();

  return (
    new Elysia({ prefix: "/api/duels" })
      .use(createProtection(auth))
      .use(websocket())
      .post(
        "/",
        { participant: true, response: { 201: DuelModel.RootPost.Response } },
        async ({ status }) => status(201, { id: await createDuel(redis, expiryMs) }),
      )
      // Lets a client tell why its upgrade was refused, which a browser WebSocket never shows.
      .get(
        "/:id",
        {
          participant: true,
          params: DuelModel.IdGet.Params,
          response: { 200: DuelModel.IdGet.Response, 404: DuelModel.IdGet.NotFound },
        },
        async ({ params, status }) => {
          const duel = await readDuel(redis, params.id);
          if (!duel) return status(404, { code: "DUEL_NOT_FOUND" });
          return { participants: [...duel.participants] };
        },
      )
      .ws("/:id/socket", {
        participant: true,
        params: DuelModel.IdSocket.Params,
        body: DuelModel.IdSocket.Body,
        async beforeHandle({ body, params, identity, request, status }) {
          // Also runs before each message, which carries a body: the seat is claimed on the upgrade only.
          if (body !== undefined) return;
          // A plain request must not claim a seat it could never use.
          if (request.headers.get("upgrade")?.toLowerCase() !== "websocket")
            return status(426, { code: "UPGRADE_REQUIRED" });
          const claimed = await claimSeat(redis, params.id, identity);
          if (claimed === "unknown") return status(404, { code: "DUEL_NOT_FOUND" });
          if (claimed === "full") return status(409, { code: "DUEL_FULL" });
          if (claimed === "seated") return status(409, { code: "ALREADY_SEATED" });
        },
        // Hands a new Guest their cookie with the handshake, the only response a socket gets.
        upgrade: ({ set }) => set.headers,
        async open(ws) {
          const duel = await readDuel(redis, ws.params.id);
          const seat = duel?.holderIds.indexOf(ws.identity.id);
          const self = duel?.participants.find((participant) => participant.seat === seat);
          // Only when the Duel expired between the claim and the opening.
          if (!duel || !self) return ws.close();
          const journals = await readJournals(redis, ws.params.id);
          const game = journals[self.seat].reduce(
            applyEvent,
            createGame(DUEL_GAME_CONFIG, duel.words),
          );
          const send = (message: ServerMessage) => {
            // Kept as it is sent, so that judging a start never waits on Redis and overtakes nothing.
            if (message.type === "countdown") entry.startAt = message.startAt;
            ws.send(JSON.stringify(message));
          };
          const delivery = { seat: self.seat, send };
          const entry: Seating = { participant: self, delivery, startAt: null, game };
          seated.set(ws.id, entry);
          await relay.join(ws.params.id, delivery);
          send({
            type: "state",
            seat: self.seat,
            words: duel.words,
            participants: duel.participants,
            journals,
          });
          await relay.publish(ws.params.id, self.seat, { type: "presence", participant: self });
          const start = await announceStart(redis, ws.params.id, Date.now() + countdownMs);
          if (!start) return;
          const countdown = { type: "countdown", startAt: start.startAt } as const;
          send(countdown);
          if (start.announced) await relay.publish(ws.params.id, self.seat, countdown);
        },
        async message(ws, message) {
          const now = Date.now();
          if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong", clientAt: message.clientAt, serverAt: now }));
            return;
          }
          const seat = seated.get(ws.id);
          const { event } = message;
          const started = seat?.game.status !== "ready";
          if (!seat || !isEventAccepted(event, { started, startAt: seat.startAt, now })) return;
          seat.game = applyEvent(seat.game, event);
          await appendEvent(redis, ws.params.id, seat.participant.seat, event, expiryMs);
          await relay.publish(ws.params.id, seat.participant.seat, {
            type: "opponentEvent",
            event,
          });
        },
        async close(ws) {
          const seat = seated.get(ws.id);
          if (!seat) return;
          seated.delete(ws.id);
          const { participant, delivery } = seat;
          await relay.leave(ws.params.id, delivery);
          await releaseSeat(redis, ws.params.id, participant.seat);
          await relay.publish(ws.params.id, participant.seat, {
            type: "presence",
            participant: { ...participant, connected: false },
          });
        },
      })
  );
};
