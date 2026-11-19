import { t } from "elysia";

const tiers = [
  t.Literal("bronze"),
  t.Literal("silver"),
  t.Literal("gold"),
  t.Literal("platinum"),
  t.Literal("diamond"),
  t.Literal("master"),
] as const;

const ornamentChoice = t.Union(
  [t.Literal("auto"), t.Literal("none"), t.Literal("unranked"), ...tiers],
  {
    // Elysia's default validation response has another shape and loses its detail in production.
    error: () => ({ code: "ORNAMENT_INVALID" }),
  },
);

// Null for a bare Avatar; the Division only shows with Auto, below Master.
const ornament = t.Nullable(
  t.Object({
    tier: t.Union([t.Literal("unranked"), ...tiers]),
    division: t.Nullable(t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4)])),
  }),
);

const ownOrnament = t.Object({
  choice: ornamentChoice,
  // The highest Tier the Player ever reached, null before their first Rank.
  peakTier: t.Nullable(t.Union([...tiers])),
  worn: ornament,
});

export const MeOrnamentGet = {
  Response: ownOrnament,
};

export const MeOrnamentPut = {
  Body: t.Object({ choice: ornamentChoice }),
};
