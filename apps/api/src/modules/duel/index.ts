import {
  anchorStart,
  boundEvent,
  COUNTDOWN_MS,
  DUEL_GAME_CONFIG,
  END_GRACE_MS,
  type Participant,
  ROUND_PAUSE_MS,
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
  announceCountdown,
  announceStart,
  appendEvents,
  claimSeat,
  closeOverdueGames,
  createDeadlineWatch,
  createDuel,
  DUEL_EXPIRY_MS,
  endRound,
  finishedRounds,
  holdSeat,
  isEventAccepted,
  readDuel,
  readJournals,
  readRounds,
  releaseSeat,
  replayGame,
  startLateGame,
} from "./service.ts";

export type DuelOptions = {
  readonly expiryMs?: number;
  readonly countdownMs?: number;
  /** The pause between the end of a Round and the Countdown of the next one. */
  readonly roundPauseMs?: number;
};

export const createDuelRoutes = (
  db: Db,
  auth: Auth,
  redis: Redis,
  {
    expiryMs = DUEL_EXPIRY_MS,
    countdownMs = COUNTDOWN_MS,
    roundPauseMs = ROUND_PAUSE_MS,
  }: DuelOptions = {},
) => {
  const relay = createRelay(redis);
  const delays = { expiryMs, countdownMs, roundPauseMs };
  type Seating = {
    participant: Participant;
    /** The Round this socket plays, the only one whose Events it takes: the last one it was told the Countdown of. */
    round: number;
    /** Tells this socket from an older or newer one of the same seat. */
    connection: string;
    delivery: Parameters<typeof relay.join>[1];
    /** The Start this socket was told of, in server time, whichever instance announced it. */
    startAt: number | null;
    /** The server instant the `start` of the Participant's Game is anchored at, wherever it was received. */
    anchorAt: number | null;
    /** This instance's copy of the Participant's Game, rebuilt from its journal on opening. */
    game: Game;
  };
  // What each open socket is seated as, set on open and read on messages and on close.
  const seated = new Map<string, Seating>();

  const deadlines = createDeadlineWatch(END_GRACE_MS);
  // Closes the Games of a Round left open past their deadline, which also ends the Round.
  const watchDeadline = (duelId: string, round: number, startAt: number) =>
    deadlines.watch(
      `${duelId}:${round}:deadline`,
      startAt + DUEL_GAME_CONFIG.seconds * 1000 + END_GRACE_MS,
      () => closeOverdueGames(db, redis, relay, duelId, round, delays),
    );
  // Follows a Round whose Start is fixed and whose Countdown is still to come: nobody has to be
  // connected for it to be announced, nor for its Games to be closed.
  const watchRound = (duelId: string, round: number, startAt: number) => {
    const countdownAt = startAt - countdownMs;
    deadlines.watch(`${duelId}:${round}:countdown`, countdownAt, () =>
      // A timer may fire a moment early: the Countdown is still the one that ends at the Start.
      announceCountdown(redis, relay, duelId, round, {
        startAt: Math.max(Date.now() + countdownMs, startAt),
        expiryMs,
      }),
    );
    watchDeadline(duelId, round, startAt);
  };

  return (
    new Elysia({ prefix: "/api/duels" })
      .use(createProtection(auth))
      .use(websocket())
      // A stopped instance closes no Game any more, as if it had crashed.
      .onStop(() => deadlines.stop())
      .post(
        "/",
        { participant: true, response: { 201: DuelModel.RootPost.Response } },
        async ({ status }) => status(201, { id: await createDuel(redis, "custom", expiryMs) }),
      )
      // Lets a client tell why its upgrade was refused, which a browser WebSocket never shows.
      .get(
        "/:id",
        {
          participant: true,
          params: DuelModel.IdGet.Params,
          response: DuelModel.IdGet.Response,
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
        response: DuelModel.IdSocket.Response,
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
          const round = duel.round.number;
          const { words, startAt, announced, anchorAts } = duel.round;
          const rounds = finishedRounds(await readRounds(redis, ws.params.id, round));
          const journals = await readJournals(redis, ws.params.id, round);
          const lateStart = await startLateGame(redis, ws.params.id, round, self.seat, {
            journal: journals[self.seat],
            startAt,
            now: Date.now(),
            expiryMs,
          });
          if (lateStart) journals[self.seat] = lateStart;
          const game = replayGame(words, journals[self.seat]);
          const send = (message: ServerMessage) => {
            // Kept as it is sent, so that judging a start never waits on Redis and overtakes nothing.
            if (message.type === "countdown") {
              // The Countdown of a new Round: its Game is the one this socket plays from now on.
              if (message.round !== entry.round) {
                entry.round = message.round;
                entry.game = replayGame(message.words, []);
                entry.anchorAt = null;
              }
              entry.startAt = message.startAt;
              watchDeadline(ws.params.id, message.round, message.startAt);
            }
            if (message.type === "roundEnd" && message.nextStartAt !== null)
              watchRound(ws.params.id, message.round + 1, message.nextStartAt);
            ws.send(message);
          };
          const connection = crypto.randomUUID();
          const delivery = { seat: self.seat, connection, send, evict: () => ws.close() };
          // A Game this opening started is anchored at the Start, as `startLateGame` keeps it.
          const anchorAt = lateStart ? startAt : (anchorAts[self.seat] ?? null);
          const entry: Seating = {
            participant: self,
            round,
            connection,
            delivery,
            startAt: null,
            anchorAt,
            game,
          };
          seated.set(ws.id, entry);
          await holdSeat(redis, ws.params.id, self.seat, connection);
          await relay.join(ws.params.id, delivery);
          // A reconnection: the socket that held the seat until now stops acting for it.
          await relay.takeOver(ws.params.id, self.seat, connection);
          send({
            type: "state",
            seat: self.seat,
            round,
            rounds,
            startAt,
            // Held back until the Countdown, which brings them to both Participants at once.
            words: announced ? words : null,
            participants: duel.participants,
            journals,
          });
          await relay.publish(ws.params.id, self.seat, { type: "presence", participant: self });
          for (const event of lateStart ?? [])
            await relay.publish(ws.params.id, self.seat, { type: "opponentEvent", event });
          // A Participant back between two Rounds: this instance follows the coming one too.
          if (startAt !== null && !announced) watchRound(ws.params.id, round, startAt);
          // A Round that has ended has no Countdown left to be told of.
          const start =
            duel.round.end === null
              ? await announceStart(redis, ws.params.id, round, {
                  startAt: Date.now() + countdownMs,
                  expiryMs,
                })
              : null;
          if (start) {
            const countdown = { type: "countdown", round, startAt: start.startAt, words } as const;
            send(countdown);
            if (start.announced) await relay.publish(ws.params.id, self.seat, countdown);
          }
          if (duel.end) send(duel.end);
        },
        async message(ws, message) {
          const now = Date.now();
          if (message.type === "ping") {
            ws.send({ type: "pong", clientAt: message.clientAt, serverAt: now });
            return;
          }
          const seating = seated.get(ws.id);
          const { event } = message;
          if (!seating || message.round !== seating.round) return;
          const { status, startedAt } = seating.game;
          const { startAt } = seating;
          if (!isEventAccepted(event, { status, startAt, now })) return;
          // Only a start is accepted in a Game that has not started.
          if (startedAt === null && startAt !== null) seating.anchorAt = anchorStart(now, startAt);
          const { anchorAt } = seating;
          // The Event as bounded by its receipt is the only one applied, journaled and relayed
          // (ADR 0009). A start is the reference the later Events are bounded from.
          const taken =
            startedAt === null || anchorAt === null
              ? event
              : boundEvent(event, { startedAt, anchorAt, receivedAt: now });
          seating.game = applyEvent(seating.game, taken);
          const ends = seating.game.status === "finished";
          const { seat } = seating.participant;
          const { round } = seating;
          const appended = await appendEvents(redis, ws.params.id, round, seat, [taken], {
            ends,
            expiryMs,
            anchorAt: startedAt === null ? anchorAt : null,
          });
          // Refused when the server already ended this Game, from this instance or another one.
          if (!appended) return;
          await relay.publish(ws.params.id, seat, { type: "opponentEvent", event: taken });
          // Tried again at the deadline when it fails.
          if (ends)
            await endRound(db, redis, relay, ws.params.id, round, delays).catch((error: unknown) =>
              console.error(`Could not end Round ${round} of Duel ${ws.params.id}`, error),
            );
        },
        async close(ws) {
          const seating = seated.get(ws.id);
          if (!seating) return;
          seated.delete(ws.id);
          const { participant, connection, delivery } = seating;
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
