import { t } from "elysia";

const lp = t.Integer();

// Every field of the Standing a Player may see. The MMR is hidden (ADR 0006): left out here, it is
// stripped from whatever a handler returns.
export const standing = t.Object({
  rank: t.Union([
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
    // Unranked.
    t.Null(),
  ]),
  placement: t.Object({ played: t.Integer(), total: t.Integer() }),
});

export const RootGet = {
  Response: standing,
};
