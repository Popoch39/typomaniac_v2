import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";

// A ranked Duel withdrawn where the cheating paid, as one of its Players may see it: never the MMR
// (ADR 0006), nor who was at fault or why.
const voidedDuel = t.Object({
  duelId: t.String(),
  // Epoch milliseconds.
  voidedAt: t.Number(),
  // Null when the Opponent has no Nickname, or no account any more.
  opponentNickname: t.Nullable(t.String()),
  // The Opponent has been banned since: shown marked as such, never with why.
  opponentBanned: t.Boolean(),
  // The LP the voiding gave back (positive) or took (negative), signed.
  lp: t.Integer(),
});

// The Suspension that keeps the Player out of the Queue now, as they may see it: its end and where
// to contest it, never its cause nor any signal (ADR 0014).
const suspension = t.Object({
  // Epoch milliseconds; the Queue opens again by itself at that instant.
  endsAt: t.Number(),
  appealAddress: t.String(),
});

// Every administration route answers it to anyone but the administrator, a Guest included.
const forbidden = t.Object({ code: t.Literal("FORBIDDEN") });

const reviewReason = t.Union([t.Literal("suspicion"), t.Literal("master"), t.Literal("podium")]);

// An open Review as the administrator's queue lists it.
const openReview = t.Object({
  id: t.String(),
  playerId: t.String(),
  // Null while the Player has not chosen one.
  nickname: t.Nullable(t.String()),
  reason: reviewReason,
  // Epoch milliseconds.
  openedAt: t.Number(),
  // Null until the fair-play pass computed one, as for a Player reviewed for Master or the Podium
  // without a ranked Game analysed yet.
  suspicion: t.Nullable(t.Number()),
});

export const AdminReviewsGet = {
  Response: {
    // Highest Suspicion first, those without one last, then the oldest first.
    200: t.Array(openReview),
    403: forbidden,
  },
};

const outcome = t.Union([t.Literal("win"), t.Literal("loss"), t.Literal("draw")]);

// Written again from the `standing` module, since a model is not imported across modules.
const lp = t.Integer();
const rank = t.Union([
  t.Object({
    tier: t.Union([
      t.Literal("bronze"),
      t.Literal("silver"),
      t.Literal("gold"),
      t.Literal("platinum"),
      t.Literal("diamond"),
    ]),
    division: t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4)]),
    lp,
  }),
  t.Object({ tier: t.Literal("master"), lp }),
]);

// Written again from the `duel` module: the journal as saved, to be replayed by the typing engine.
const at = t.Number();
const gameEvent = t.Union([
  t.Object({ type: t.Literal("start"), at }),
  t.Object({ type: t.Literal("keyDown"), at, code: t.String() }),
  t.Object({ type: t.Literal("keyUp"), at, code: t.String() }),
  t.Object({ type: t.Literal("insert"), at, text: t.String() }),
  t.Object({
    type: t.Literal("delete"),
    at,
    unit: t.Union([t.Literal("char"), t.Literal("word")]),
  }),
  t.Object({ type: t.Literal("tick"), at }),
  t.Object({ type: t.Literal("addWords"), words: t.Immutable(t.Array(t.String())) }),
]);

// One saved ranked Game of the reviewed Player, with what each signal said of it, in the order of the
// fair-play engine's signals; null while the fair-play pass has not read it yet.
const reviewedGame = t.Object({
  round: t.Integer(),
  outcome,
  signals: t.Nullable(t.Array(t.Object({ name: t.String(), value: t.Number() }))),
  // What the replay is drawn from: the Target words of the Round and the journal of the seat.
  words: t.Array(t.String()),
  journal: t.Array(gameEvent),
  // The part of the saved Result the replay ends on.
  result: t.Object({
    duration: t.Number(),
    wpm: t.Number(),
    rawWpm: t.Number(),
    accuracy: t.Number(),
    consistency: t.Number(),
  }),
});

export const AdminReviewsIdGet = {
  Params: t.Object({ id: t.String({ format: "uuid" }) }),
  Response: {
    200: t.Object({
      id: t.String(),
      reason: reviewReason,
      // Epoch milliseconds.
      openedAt: t.Number(),
      player: t.Object({ id: t.String(), nickname: t.Nullable(t.String()), banned: t.Boolean() }),
      suspicion: t.Nullable(t.Number()),
      // The whole Standing, the MMR included: the administrator is not a Player looking at it.
      standing: t.Object({ mmr: t.Integer(), duelsPlayed: t.Integer(), rank: t.Nullable(rank) }),
      // The Player's recent ranked Duels, newest first.
      duels: t.Array(
        t.Object({
          duelId: t.String(),
          // Epoch milliseconds.
          endedAt: t.Number(),
          outcome,
          // The LP the Duel moved for the Player, signed; null during the Placement.
          lpDelta: t.Nullable(t.Integer()),
          // Null when the Opponent has no Nickname, or no account any more.
          opponentNickname: t.Nullable(t.String()),
          games: t.Array(reviewedGame),
        }),
      ),
      // Newest first.
      violations: t.Array(
        t.Object({
          duelId: t.String(),
          round: t.Integer(),
          kind: t.Union([t.Literal("multipleCharacters"), t.Literal("noKeyPress")]),
          // Epoch milliseconds.
          committedAt: t.Number(),
        }),
      ),
      // Every Sanction, revoked ones included, newest first. Instants in epoch milliseconds.
      sanctions: t.Array(
        t.Object({
          id: t.String(),
          kind: t.Union([t.Literal("voided_duel"), t.Literal("suspension"), t.Literal("ban")]),
          cause: t.Union([t.Literal("violation"), t.Literal("review")]),
          startedAt: t.Number(),
          endsAt: t.Nullable(t.Number()),
          revokedAt: t.Nullable(t.Number()),
        }),
      ),
      // The Reports made against the Player, newest first: weighed with the signals, never shown to them.
      reports: t.Array(
        t.Object({
          duelId: t.String(),
          // Null when the reporting Player has no Nickname.
          reporterNickname: t.Nullable(t.String()),
          // Epoch milliseconds.
          reportedAt: t.Number(),
        }),
      ),
    }),
    403: forbidden,
    404: t.Object({ code: t.Literal("REVIEW_NOT_FOUND") }),
  },
};

export const DuelsIdReportPost = {
  Params: t.Object({ id: t.String({ format: "uuid" }) }),
  Response: {
    // Received: nothing more is said, the reported Player least of all.
    204: t.Void(),
    // Refused alike to a Player who took no part in it and for a Custom Duel, so that a Report tells
    // nothing of a Duel to a stranger.
    404: t.Object({ code: t.Literal("DUEL_NOT_FOUND") }),
    409: t.Object({ code: t.Literal("REPORT_ALREADY_MADE") }),
    429: RateLimited,
  },
};

export const MeFairPlayGet = {
  Response: t.Object({
    // Newest first.
    voidedDuels: t.Array(voidedDuel),
    // Null when the Player is not suspended.
    suspension: t.Nullable(suspension),
  }),
};
