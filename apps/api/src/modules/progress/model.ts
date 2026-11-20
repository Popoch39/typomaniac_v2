import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";

const tier = t.Union([
  t.Literal("bronze"),
  t.Literal("silver"),
  t.Literal("gold"),
  t.Literal("platinum"),
  t.Literal("diamond"),
  t.Literal("master"),
]);

const division = t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4)]);

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
    division,
    lp,
  }),
  t.Object({ tier: t.Literal("master"), lp }),
]);

// Written again from the `ornament` module since a model is not imported across modules. `null` for
// a bare Avatar; the Division only in Auto, below Master.
const ornament = t.Nullable(
  t.Object({
    tier: t.Union([t.Literal("unranked"), ...tier.anyOf]),
    division: t.Nullable(division),
  }),
);

// What anyone may see of a Player: never their MMR (ADR 0006), nor their id.
const publicPlayer = t.Object({
  nickname: t.String(),
  avatarUrl: t.Nullable(t.String()),
  ornament,
  // Null while Unranked.
  rank: t.Nullable(rank),
  // The highest Tier the Player ever reached, null before their first Rank.
  peakTier: t.Nullable(tier),
});

// One point of the Progress: a Game the Player played, judged by the server.
const progressGame = t.Object({
  // The end of the Game's Duel, in milliseconds since the epoch.
  endedAt: t.Number(),
  kind: t.Union([t.Literal("ranked"), t.Literal("custom")]),
  wpm: t.Number(),
  rawWpm: t.Number(),
  accuracy: t.Number(),
  consistency: t.Number(),
});

// The Duels of the Progress by their Duel Outcome for the Player, each counted once.
const progressSummary = t.Object({
  won: t.Integer(),
  lost: t.Integer(),
  drawn: t.Integer(),
});

export const NicknameGet = {
  Params: t.Object({ nickname: t.String() }),
  Response: {
    200: publicPlayer,
    404: t.Object({ code: t.Literal("PLAYER_NOT_FOUND") }),
    429: RateLimited,
  },
};

export const NicknameProgressGet = {
  Params: t.Object({ nickname: t.String() }),
  Query: t.Object({
    // The Duels read: the last 20 (when left out), those ended in the last 30 days, or all of them.
    window: t.Optional(t.Union([t.Literal("20-duels"), t.Literal("30-days"), t.Literal("all")])),
    // Every Duel (when left out), or only ranked or only Custom ones.
    kind: t.Optional(t.Union([t.Literal("all"), t.Literal("ranked"), t.Literal("custom")])),
  }),
  Response: {
    // Oldest first.
    200: t.Object({ games: t.Array(progressGame), summary: progressSummary }),
    404: t.Object({ code: t.Literal("PLAYER_NOT_FOUND") }),
    429: RateLimited,
  },
};
