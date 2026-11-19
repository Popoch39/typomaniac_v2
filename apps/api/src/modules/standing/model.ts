import { t } from "elysia";

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

// Every field of the Standing a Player may see. The MMR is hidden (ADR 0006): left out here, it is
// stripped from whatever a handler returns.
export const standing = t.Object({
  // Null while Unranked.
  rank: t.Nullable(rank),
  placement: t.Object({
    played: t.Integer(),
    total: t.Integer(),
    // The Outcome of each Placement Duel played, in the order they were played.
    outcomes: t.Array(t.Union([t.Literal("win"), t.Literal("loss"), t.Literal("draw")])),
  }),
});

export const MeStandingGet = {
  Response: standing,
};

// A ranked Player as anyone may see them on the Leaderboard: never their MMR, nor their id.
const leaderboardPlayer = t.Object({
  position: t.Integer(),
  nickname: t.Nullable(t.String()),
  avatarUrl: t.Nullable(t.String()),
  rank,
});

export const LeaderboardGet = {
  Response: t.Object({
    players: t.Array(leaderboardPlayer),
    // The signed-in Player's own place, wherever it is; null for a Guest and an Unranked Player.
    own: t.Nullable(leaderboardPlayer),
  }),
};
