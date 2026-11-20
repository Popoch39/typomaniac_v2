import { t } from "elysia";

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

// A Sanction as the administrator reads it. Instants in epoch milliseconds; `endsAt` only for a
// Suspension, `revokedAt` null until it is revoked after an appeal.
const sanctionRecord = t.Object({
  id: t.String(),
  kind: t.Union([t.Literal("voided_duel"), t.Literal("suspension"), t.Literal("ban")]),
  cause: t.Union([t.Literal("violation"), t.Literal("review")]),
  startedAt: t.Number(),
  endsAt: t.Nullable(t.Number()),
  revokedAt: t.Nullable(t.Number()),
});

// One saved ranked Game of the reviewed Player, with what each signal said of it, in the order of the
// fair-play engine's signals; null while the fair-play pass has not read it yet.
const reviewedGame = t.Object({
  round: t.Integer(),
  outcome,
  signals: t.Nullable(t.Array(t.Object({ name: t.String(), value: t.Number() }))),
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
      // Every Sanction, revoked ones included, newest first.
      sanctions: t.Array(sanctionRecord),
    }),
    403: forbidden,
    404: t.Object({ code: t.Literal("REVIEW_NOT_FOUND") }),
  },
};

const reviewNotFound = t.Object({ code: t.Literal("REVIEW_NOT_FOUND") });

export const AdminReviewsIdSettlementPost = {
  Params: t.Object({ id: t.String({ format: "uuid" }) }),
  // The four endings of a Review: clearing the Player, or a Sanction with cause Review.
  Body: t.Union([
    t.Object({ decision: t.Literal("cleared") }),
    t.Object({
      decision: t.Literal("voided_duels"),
      // Ranked Duels of the reviewed Player; those they lost or drew are left alone (ADR 0015).
      duelIds: t.Array(t.String({ format: "uuid" }), { minItems: 1 }),
    }),
    t.Object({ decision: t.Literal("suspension") }),
    t.Object({ decision: t.Literal("ban") }),
  ]),
  Response: {
    204: t.Void(),
    403: forbidden,
    404: t.Union([reviewNotFound, t.Object({ code: t.Literal("DUEL_NOT_FOUND") })]),
    409: t.Object({ code: t.Literal("REVIEW_ALREADY_SETTLED") }),
  },
};

export const AdminPlayersIdSanctionsGet = {
  Params: t.Object({ id: t.String() }),
  Response: {
    // Revoked ones included, newest first.
    200: t.Array(sanctionRecord),
    403: forbidden,
    404: t.Object({ code: t.Literal("PLAYER_NOT_FOUND") }),
  },
};

export const AdminSanctionsIdRevocationPost = {
  Params: t.Object({ id: t.String({ format: "uuid" }) }),
  Response: {
    204: t.Void(),
    403: forbidden,
    404: t.Object({ code: t.Literal("SANCTION_NOT_FOUND") }),
    409: t.Object({ code: t.Literal("SANCTION_ALREADY_REVOKED") }),
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
