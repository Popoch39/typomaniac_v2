import { t } from "elysia";

// A ranked Duel withdrawn where the cheating paid, as one of its Players may see it: never the MMR
// (ADR 0006), nor who was at fault or why.
const voidedDuel = t.Object({
  duelId: t.String(),
  // Epoch milliseconds.
  voidedAt: t.Number(),
  // Null when the Opponent has no Nickname, or no account any more.
  opponentNickname: t.Nullable(t.String()),
  // The LP the voiding gave back (positive) or took (negative), signed.
  lp: t.Integer(),
});

export const MeFairPlayGet = {
  Response: t.Object({
    // Newest first.
    voidedDuels: t.Array(voidedDuel),
  }),
};
