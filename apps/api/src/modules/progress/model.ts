import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";

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

// One point of the Rank chart: the Rank a ranked Duel ended with, as the ladder holds it. Never the MMR.
const rankPoint = t.Object({
  // The end of the Duel, in milliseconds since the epoch.
  endedAt: t.Number(),
  // The Division's steps above Bronze IV, Master one step above Diamond I.
  ladderIndex: t.Integer(),
  lp: t.Integer(),
  rankChange: t.Union([
    t.Literal("placed"),
    t.Literal("promoted"),
    t.Literal("demoted"),
    t.Literal("none"),
  ]),
});

export const NicknameProgressGet = {
  Params: t.Object({ nickname: t.String() }),
  Query: t.Object({
    // The Duels read: the last 20 (when left out), those ended in the last 30 days, or all of them.
    window: t.Optional(t.Union([t.Literal("20-duels"), t.Literal("30-days"), t.Literal("all")])),
    // Every Duel (when left out), or only ranked or only Custom ones.
    kind: t.Optional(t.Union([t.Literal("all"), t.Literal("ranked"), t.Literal("custom")])),
  }),
  Response: {
    // Oldest first. The Rank points come from the ranked Duels of the window whatever the kind, as
    // a Custom Duel never moves the Rank, from the one that ended the Placement on.
    200: t.Object({
      games: t.Array(progressGame),
      summary: progressSummary,
      rankPoints: t.Array(rankPoint),
    }),
    404: t.Object({ code: t.Literal("PLAYER_NOT_FOUND") }),
    429: RateLimited,
  },
};
