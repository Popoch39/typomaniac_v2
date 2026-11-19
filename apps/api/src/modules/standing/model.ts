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

// The Ornament a Player wears, written again from the `ornament` module since a model is not imported
// across modules. `null` for a bare Avatar; the Division only in Auto, below Master.
const ornament = t.Nullable(
  t.Object({
    tier: t.Union([
      t.Literal("unranked"),
      t.Literal("bronze"),
      t.Literal("silver"),
      t.Literal("gold"),
      t.Literal("platinum"),
      t.Literal("diamond"),
      t.Literal("master"),
    ]),
    division: t.Nullable(t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4)])),
  }),
);

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
  ornament,
});

export const LeaderboardGet = {
  Query: t.Object({
    // 1 when left out.
    page: t.Optional(t.Integer({ minimum: 1 })),
  }),
  Response: t.Object({
    // Positions 1 to 3, fewer while fewer Players are ranked.
    podium: t.Array(leaderboardPlayer),
    // The served page, from Position 4 on.
    players: t.Array(leaderboardPlayer),
    // The page actually served: the last one when the requested page is past it.
    page: t.Integer(),
    // At least 1, even with no Player after the Podium.
    pageCount: t.Integer(),
    // How many Players are ranked.
    total: t.Integer(),
    // The signed-in Player's own Position, wherever it is; null for a Guest and an Unranked Player.
    own: t.Nullable(leaderboardPlayer),
    // The Player just ahead (if any), the reader and the Player just behind (if any), in Leaderboard
    // order; null unless the reader is ranked and neither on the Podium nor on the served page.
    around: t.Nullable(t.Array(leaderboardPlayer)),
  }),
};
