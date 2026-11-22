import {
  anchorStart,
  boundEvent,
  COUNTDOWN_MS,
  findViolation,
  type KeyPairing,
  NO_KEYS_PAIRED,
  pairKeys,
  type Participant,
  ROUND_PAUSE_MS,
  type ServerMessage,
  VIOLATION_CLOSE_REASON,
} from "@repo/duel-engine";
import type { Logger } from "@repo/logger";
import { applyEvent, type Game } from "@repo/typing-engine";
import { Elysia } from "elysia";
import { websocket } from "elysia/websocket";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { type Protection, personOf } from "../auth/index.ts";
import { CloseCode } from "../lifecycle/closeCode.ts";
import { logSocketFailure } from "../http/index.ts";
import type { Lifecycle } from "../lifecycle/service.ts";
import { createSocketPhases } from "../lifecycle/socketPhase.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import { readWornOrnaments } from "../ornament/service.ts";
import * as DuelModel from "./model.ts";
import { createRelay } from "./relay.ts";
import {
  announceStart,
  appendEvents,
  claimSeat,
  createDuel,
  DUEL_EXPIRY_MS,
  DUEL_SWEEP_INTERVAL_MS,
  endRound,
  finishedRounds,
  holdSeat,
  isEventAccepted,
  readDuel,
  readJournals,
  readRounds,
  recordHints,
  recordViolation,
  releaseSeat,
  replayGame,
  startLateGame,
  sweepDuels,
} from "./service.ts";

export type DuelOptions = {
  readonly expiryMs?: number;
  readonly countdownMs?: number;
  /** The pause between the end of a Round and the Countdown of the next one. */
  readonly roundPauseMs?: number;
  /** How often this instance sweeps the Duels that have something due. */
  readonly sweepIntervalMs?: number;
  /**
   * From the creation of a ranked Duel to the Countdown of its first Round, when its Players are not
   * both connected by then.
   */
  readonly connectMs?: number;
};

export const createDuelRoutes = (
  db: Db,
  protection: Protection,
  rateLimiter: RateLimiter,
  redis: Redis,
  logger: Logger,
  lifecycle: Lifecycle,
  {
    expiryMs = DUEL_EXPIRY_MS,
    countdownMs = COUNTDOWN_MS,
    roundPauseMs = ROUND_PAUSE_MS,
    sweepIntervalMs = DUEL_SWEEP_INTERVAL_MS,
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
    /** Whether the Duel is ranked, the only kind in which a Violation is refused (ADR 0016). */
    ranked: boolean;
    /** What pairs each insert of the Game with a KeyPress, rebuilt from its journal like the Game. */
    keys: KeyPairing;
  };
  // What each open socket is seated as, set on open and read on messages and on close.
  const seated = new Map<string, Seating>();
  // The message counter of each open socket, with whom to blame in the warning, and the sockets
  // closed for flooding or for a Violation, whose messages still in flight are dropped as well.
  const messageWindows = new Map<
    string,
    { readonly overCap: (now: number) => boolean; readonly key: string; readonly duelId: string }
  >();
  const closing = new Set<string>();
  // A socket closed while opening is let go of by its open, at its next step: its close cannot
  // release a seat the open has not finished taking.
  const phases = createSocketPhases();

  const leaveSeat = async (duelId: string, { participant, connection, delivery }: Seating) => {
    await relay.leave(duelId, delivery);
    // Replaced by a reconnection: the Participant is not away.
    if (!(await releaseSeat(redis, duelId, participant.seat, connection))) return;
    await relay.publish(duelId, participant.seat, {
      type: "presence",
      participant: { ...participant, connected: false },
    });
  };

  // Every instance sweeps the Duels that have something due, its own or not: a Duel moves forward
  // whoever is connected to it, and on whichever instance. One sweep at a time: a slow one is not
  // overtaken by the next.
  let sweeper: ReturnType<typeof setInterval> | undefined;
  let sweep: Promise<void> | undefined;
  const runSweep = () => {
    sweep ??= sweepDuels(db, redis, relay, delays, Date.now(), logger)
      .catch((error: unknown) => logger.error("Could not sweep the Duels", { error }))
      .finally(() => {
        sweep = undefined;
      });
  };

  return (
    new Elysia({ prefix: "/api/duels" })
      .use(protection)
      .use(websocket())
      .onStart(() => {
        sweeper = setInterval(runSweep, sweepIntervalMs);
      })
      // A stopped instance advances no Duel any more, as if it had crashed; the sweep it is in the
      // middle of is left to finish.
      .onStop(async () => {
        clearInterval(sweeper);
        await sweep;
      })
      .post(
        "/",
        { participant: true, response: { 201: DuelModel.RootPost.Response } },
        async ({ identity, request, server, set, status }) => {
          // Per IP as well: a Guest who drops their cookie becomes a new Participant.
          const refused =
            (await rateLimiter.check("duelPerParticipant", identity.id, set)) ??
            (await rateLimiter.check("duelPerIp", rateLimiter.clientIp(request, server), set));
          if (refused) return refused;
          return status(201, { id: await createDuel(redis, "custom", expiryMs) });
        },
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
        async beforeHandle({ body, params, identity, request, set, status }) {
          // Also runs before each message, which carries a body: the seat is claimed on the upgrade only.
          if (body !== undefined) return;
          // A plain request must not claim a seat it could never use.
          if (request.headers.get("upgrade")?.toLowerCase() !== "websocket")
            return status(426, { code: "UPGRADE_REQUIRED" });
          // Before anything is read or claimed, so that a reconnection loop costs nothing.
          const refused = await rateLimiter.check("duelSocket", identity.id, set);
          if (refused) return refused;
          // Read on every upgrade, though only a first claim keeps it: the Duel holds the Ornament the seat was taken with.
          const ornament =
            identity.playerId === null
              ? null
              : ((await readWornOrnaments(db, [identity.playerId])).get(identity.playerId) ?? null);
          const claimed = await claimSeat(redis, params.id, { ...identity, ornament });
          if (claimed === "unknown") return status(404, { code: "DUEL_NOT_FOUND" });
          if (claimed === "full") return status(409, { code: "DUEL_FULL" });
        },
        // Hands a new Guest their cookie with the handshake, the only response a socket gets.
        upgrade: ({ set }) => set.headers,
        // Runs on every message before its body is validated, so that malformed ones count too.
        parse(ws) {
          const counted = messageWindows.get(ws.id);
          if (!counted || closing.has(ws.id) || !counted.overCap(Date.now())) return;
          closing.add(ws.id);
          logger.warn("Duel socket of {key} in seat {seat} of Duel {duelId} closed for flooding", {
            limit: "socketMessages",
            key: counted.key,
            duelId: counted.duelId,
            seat: seated.get(ws.id)?.participant.seat ?? null,
          });
          ws.close(CloseCode.policyViolation, "message rate exceeded");
        },
        async open(ws) {
          if (!lifecycle.hold(ws.id, ws)) return;
          phases.open(ws.id);
          try {
            messageWindows.set(ws.id, {
              overCap: rateLimiter.socketMessageWindow(),
              key: ws.identity.id,
              duelId: ws.params.id,
            });
            const duel = await readDuel(redis, ws.params.id);
            const seat = duel?.holderIds.indexOf(ws.identity.id);
            const self = duel?.participants.find((participant) => participant.seat === seat);
            // Only when the Duel expired between the claim and the opening.
            if (!duel || !self) return ws.close();
            logger.info("Seat {seat} of Duel {duelId} opened", {
              duelId: ws.params.id,
              seat: self.seat,
              ...personOf(ws),
            });
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
                  entry.keys = NO_KEYS_PAIRED;
                  entry.anchorAt = null;
                }
                entry.startAt = message.startAt;
              }
              ws.send(message);
            };
            const connection = crypto.randomUUID();
            // The relay delivers from the join on, which comes before the state: what it delivers
            // until then is held back, so that the state is always the first message of a socket.
            let heldBack: ServerMessage[] | null = [];
            const delivery = {
              seat: self.seat,
              connection,
              send: (message: ServerMessage) => (heldBack ? heldBack.push(message) : send(message)),
              evict: () => ws.close(),
            };
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
              ranked: duel.kind === "ranked",
              keys: journals[self.seat].reduce(pairKeys, NO_KEYS_PAIRED),
            };
            // Closed while opening: the seat the upgrade claimed is let go of as a close would. It is
            // held first, since the claim marks it connected before any connection holds it.
            const closed = () => !phases.isOpening(ws.id);
            const abandon = async () => {
              seated.delete(ws.id);
              await holdSeat(redis, ws.params.id, self.seat, connection);
              await leaveSeat(ws.params.id, entry);
            };
            if (closed()) return abandon();
            seated.set(ws.id, entry);
            await holdSeat(redis, ws.params.id, self.seat, connection);
            if (closed()) return abandon();
            await relay.join(ws.params.id, delivery);
            if (closed()) return abandon();
            // A reconnection: the socket that held the seat until now stops acting for it.
            await relay.takeOver(ws.params.id, self.seat, connection);
            if (closed()) return abandon();
            send({
              type: "state",
              seat: self.seat,
              round,
              rounds,
              startAt,
              // Held back until the Countdown, which brings them to both Participants at once.
              words: announced ? words : null,
              participants: duel.participants,
              ranks: duel.ranks,
              journals,
            });
            for (const message of heldBack) send(message);
            heldBack = null;
            await relay.publish(ws.params.id, self.seat, { type: "presence", participant: self });
            if (closed()) return abandon();
            for (const event of lateStart ?? [])
              await relay.publish(ws.params.id, self.seat, { type: "opponentEvent", event });
            if (closed()) return abandon();
            // A Round that has ended has no Countdown left to be told of.
            const start =
              duel.round.end === null
                ? await announceStart(redis, ws.params.id, round, {
                    startAt: Date.now() + countdownMs,
                    expiryMs,
                  })
                : null;
            if (closed()) return abandon();
            if (start) {
              const countdown = {
                type: "countdown",
                round,
                startAt: start.startAt,
                words,
              } as const;
              send(countdown);
              if (start.announced) await relay.publish(ws.params.id, self.seat, countdown);
            }
            if (closed()) return abandon();
            if (duel.end) send(duel.end);
          } finally {
            phases.advance(ws.id, { kind: "opened" });
          }
        },
        async message(ws, message) {
          const now = Date.now();
          // The message over the cap is dropped, never journaled nor relayed. Closing leaves the
          // Participant away, as any disconnection does: no other sanction.
          if (closing.has(ws.id)) return;
          if (message.type === "ping") {
            ws.send({ type: "pong", clientAt: message.clientAt, serverAt: now });
            return;
          }
          const seating = seated.get(ws.id);
          if (!seating || message.round !== seating.round) return;
          // Saved with the Game for the fair-play pass, never relayed: the Opponent has no use for
          // them. A Custom Duel is never analysed, so it keeps none (ADR 0014).
          if (message.type === "hints") {
            if (seating.ranked)
              await recordHints(redis, ws.params.id, seating.round, seating.participant.seat, {
                hints: message.hints,
                expiryMs,
              });
            return;
          }
          const { event } = message;
          const { status, startedAt } = seating.game;
          const { startAt } = seating;
          if (!isEventAccepted(event, { status, startAt, now })) return;
          const { playerId } = ws.identity;
          if (seating.ranked && playerId !== null) {
            const kind = findViolation(seating.keys, event);
            seating.keys = pairKeys(seating.keys, event);
            // Refused like a flood: never applied, journaled nor relayed, and the Participant is
            // away until they reconnect. Its Sanction is left to the fair-play pass (ADR 0014).
            if (kind !== null) {
              closing.add(ws.id);
              const { round } = seating;
              const { seat } = seating.participant;
              const duelId = ws.params.id;
              logger.warn(
                "Duel socket of {playerId} in seat {seat} of Duel {duelId} closed for a Violation",
                { playerId, duelId, seat, round, kind },
              );
              await recordViolation(db, { playerId, duelId, round, kind }).catch((error: unknown) =>
                logger.error("Could not record the Violation of {playerId} in Duel {duelId}", {
                  playerId,
                  duelId,
                  error,
                }),
              );
              ws.close(CloseCode.policyViolation, VIOLATION_CLOSE_REASON);
              return;
            }
          }
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
          // Tried again by the sweep when it fails.
          if (ends)
            await endRound(db, redis, relay, ws.params.id, round, delays, Date.now()).catch(
              (error: unknown) =>
                logger.error("Could not end Round {round} of Duel {duelId}", {
                  round,
                  duelId: ws.params.id,
                  error,
                }),
            );
        },
        async close(ws, code) {
          lifecycle.release(ws.id);
          messageWindows.delete(ws.id);
          closing.delete(ws.id);
          const seating = seated.get(ws.id);
          logger.info("Socket on Duel {duelId} closed ({code})", {
            duelId: ws.params.id,
            ...(seating ? { seat: seating.participant.seat } : {}),
            ...personOf(ws),
            code,
          });
          // Still opening: its open lets go of whatever it has taken by then.
          if (phases.advance(ws.id, { kind: "close" }) !== "release") return;
          try {
            if (!seating) return;
            seated.delete(ws.id);
            await leaveSeat(ws.params.id, seating);
          } finally {
            phases.advance(ws.id, { kind: "released" });
          }
        },
        error: logSocketFailure(logger, "Socket on Duel {duelId} failed", (context, id) => {
          const seating = seated.get(id);
          return {
            duelId: context.params.id,
            ...(seating ? { seat: seating.participant.seat } : {}),
          };
        }),
      })
  );
};
