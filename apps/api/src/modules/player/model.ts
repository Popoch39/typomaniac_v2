import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";

// Shared with the service, which cuts a provider's username down to the same rules.
export const nicknameFormat = { minLength: 3, maxLength: 20, pattern: "^[A-Za-z0-9_-]+$" };

const nickname = t.String({
  ...nicknameFormat,
  // Elysia's default validation response has another shape and loses its detail in production.
  error: () => ({ code: "NICKNAME_INVALID" }),
});

// The Tiers below Master, each split into Divisions.
const dividedTier = t.Union([
  t.Literal("bronze"),
  t.Literal("silver"),
  t.Literal("gold"),
  t.Literal("platinum"),
  t.Literal("diamond"),
]);

const tier = t.Union([...dividedTier.anyOf, t.Literal("master")]);

const division = t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4)]);

const lp = t.Integer();

const rank = t.Union([
  t.Object({ tier: dividedTier, division, lp }),
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

export const MeNicknamePut = {
  Body: t.Object({ nickname }),
};

export const PlayersNicknameGet = {
  Params: t.Object({ nickname: t.String() }),
  Response: {
    200: publicPlayer,
    404: t.Object({ code: t.Literal("PLAYER_NOT_FOUND") }),
    429: RateLimited,
  },
};
