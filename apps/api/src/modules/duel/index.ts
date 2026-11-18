import {
  COUNTDOWN_MS,
  DUEL_GAME_CONFIG,
  END_GRACE_MS,
  type Participant,
  type Seat,
  type ServerMessage,
} from "@repo/duel-engine";
import { applyEvent, type Game } from "@repo/typing-engine";
import { Elysia } from "elysia";
import { websocket } from "elysia/websocket";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { createProtection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import * as DuelModel from "./model.ts";
import { createRelay } from "./relay.ts";
import {
  announceStart,
  appendEvents,
  claimFinalisation,
  claimSeat,
  closingEvents,
  createDuel,
  DUEL_EXPIRY_MS,
  holdSeat,
  isEventAccepted,
  readDuel,
  readJournals,
  recordEnd,
  releaseFinalisation,
  releaseSeat,
  replayGame,
  saveDuel,
  startLateGame,
} from "./service.ts";

export type DuelOptions = { readonly expiryMs?: number; readonly countdownMs?: number };

export const createDuelRoutes = (
  db: Db,
  auth: Auth,
  redis: Redis,
  { expiryMs = DUEL_EXPIRY_MS, countdownMs = COUNTDOWN_MS }: DuelOptions = {},
) => {
  const relay = createRelay(redis);
  type Seating = {
    participant: Participant;
    /** Tells this socket from an older or newer one of the same seat. */
    connection: string;
    delivery: Parameters<typeof relay.join>[1];
    /** The Start this socket was told of, in server time, whichever instance announced it. */
    startAt: number | null;
    /** This instance's copy of the Participant's Game, rebuilt from its journal on opening. */
    game: Game;
  };
  // What each open socket is seated as, set on open and read on messages and on close.
  const seated = new Map<string, Seating>();

  // Run by whichever instance sees both Games ended: the claim lets only one of them through.
  const finalise = async (duelId: string) => {
    if (!(await claimFinalisation(redis, duelId))) return;
    try {
      const duel = await readDuel(redis, duelId);
      // Expired meanwhile: nothing is left to save.
      if (!duel) return;
      if (duel.startAt === null) throw new Error(`Duel ${duelId} has ended without a Start`);
      const { results, outcomes } = await saveDuel(db, duelId, {
        words: duel.words,
        playerIds: duel.playerIds,
        startAt: duel.startAt,
        journals: await readJournals(redis, duelId),
      });
      const end = { type: "end", results, outcomes } as const;
      await recordEnd(redis, duelId, end);
      await relay.publish(duelId, null, end);
    } catch (error) {
      await releaseFinalisation(redis, duelId);
      throw error;
    }
  };

  // Ends the Games whose clients went silent, at their start plus 30 seconds.
  const closeOverdueGames = async (duelId: string, startAt: number) => {
    const duel = await readDuel(redis, duelId);
    if (!duel) return;
    const journals = await readJournals(redis, duelId);
    for (const seat of [0, 1] as const satisfies readonly Seat[]) {
      const game = replayGame(duel.words, journals[seat]);
      if (game.status === "finished") continue;
      const events = closingEvents(game, startAt);
      await appendEvents(redis, duelId, seat, events, { ends: true, expiryMs });
    }
    await finalise(duelId);
  };

  // One per Duel on each instance that holds one of its sockets; any of them can close it.
  const deadlines = new Map<string, ReturnType<typeof setTimeout>>();
  const watchDeadline = (
    duelId: string,
    startAt: number,
    delayMs = startAt + DUEL_GAME_CONFIG.seconds * 1000 + END_GRACE_MS - Date.now(),
  ) => {
    if (deadlines.has(duelId)) return;
    const timer = setTimeout(() => {
      closeOverdueGames(duelId, startAt).then(
        () => deadlines.delete(duelId),
        (error: unknown) => {
          console.error(`Could not close the overdue Games of Duel ${duelId}`, error);
          deadlines.delete(duelId);
          // Tried again until the Duel is finalised or expires: a failed finalisation is retried here.
          watchDeadline(duelId, startAt, END_GRACE_MS);
        },
      );
    }, delayMs);
    deadlines.set(duelId, timer);
  };

  return (
    new Elysia({ prefix: "/api/duels" })
      .use(createProtection(auth))
      .use(websocket())
      // A stopped instance closes no Game any more, as if it had crashed.
      .onStop(() => {
        for (const timer of deadlines.values()) clearTimeout(timer);
        deadlines.clear();
      })
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
          const lateStart = await startLateGame(redis, ws.params.id, self.seat, {
            journal: journals[self.seat],
            startAt: duel.startAt,
            now: Date.now(),
            expiryMs,
          });
          if (lateStart) journals[self.seat] = lateStart;
          const game = replayGame(duel.words, journals[self.seat]);
          const send = (message: ServerMessage) => {
            // Kept as it is sent, so that judging a start never waits on Redis and overtakes nothing.
            if (message.type === "countdown") {
              entry.startAt = message.startAt;
              watchDeadline(ws.params.id, message.startAt);
            }
            ws.send(JSON.stringify(message));
          };
          const connection = crypto.randomUUID();
          const delivery = { seat: self.seat, connection, send, evict: () => ws.close() };
          const entry: Seating = { participant: self, connection, delivery, startAt: null, game };
          seated.set(ws.id, entry);
          await holdSeat(redis, ws.params.id, self.seat, connection);
          await relay.join(ws.params.id, delivery);
          // A reconnection: the socket that held the seat until now stops acting for it.
          await relay.takeOver(ws.params.id, self.seat, connection);
          send({
            type: "state",
            seat: self.seat,
            words: duel.words,
            participants: duel.participants,
            journals,
          });
          await relay.publish(ws.params.id, self.seat, { type: "presence", participant: self });
          for (const event of lateStart ?? [])
            await relay.publish(ws.params.id, self.seat, { type: "opponentEvent", event });
          const start = await announceStart(redis, ws.params.id, {
            startAt: Date.now() + countdownMs,
            expiryMs,
          });
          if (!start) return;
          const countdown = { type: "countdown", startAt: start.startAt } as const;
          send(countdown);
          if (start.announced) await relay.publish(ws.params.id, self.seat, countdown);
          if (duel.end) send(duel.end);
        },
        async message(ws, message) {
          const now = Date.now();
          if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong", clientAt: message.clientAt, serverAt: now }));
            return;
          }
          const seat = seated.get(ws.id);
          const { event } = message;
          if (!seat) return;
          if (!isEventAccepted(event, { status: seat.game.status, startAt: seat.startAt, now }))
            return;
          seat.game = applyEvent(seat.game, event);
          const ends = seat.game.status === "finished";
          const appended = await appendEvents(redis, ws.params.id, seat.participant.seat, [event], {
            ends,
            expiryMs,
          });
          // Refused when the server already ended this Game, from this instance or another one.
          if (!appended) return;
          await relay.publish(ws.params.id, seat.participant.seat, {
            type: "opponentEvent",
            event,
          });
          // Tried again at the deadline when it fails.
          if (ends)
            await finalise(ws.params.id).catch((error: unknown) =>
              console.error(`Could not finalise Duel ${ws.params.id}`, error),
            );
        },
        async close(ws) {
          const seat = seated.get(ws.id);
          if (!seat) return;
          seated.delete(ws.id);
          const { participant, connection, delivery } = seat;
          await relay.leave(ws.params.id, delivery);
          // Replaced by a reconnection: the Participant is not away.
          if (!(await releaseSeat(redis, ws.params.id, participant.seat, connection))) return;
          await relay.publish(ws.params.id, participant.seat, {
            type: "presence",
            participant: { ...participant, connected: false },
          });
        },
      })
  );
};
