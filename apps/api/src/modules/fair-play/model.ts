import { t } from "elysia";

// A ranked Duel withdrawn where the cheating paid, as one of its Players may see it: never the MMR
// (ADR 0006), nor why, nor to the Opponent who was at fault.
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
  // Where to contest it, for a Duel voided against the Player as their Sanction; null for the
  // Opponent's repair.
  appealAddress: t.Nullable(t.String()),
});

// The Suspension that keeps the Player out of the Queue now, as they may see it: its end and where
// to contest it, never its cause nor any signal (ADR 0014).
const suspension = t.Object({
  // Epoch milliseconds; the Queue opens again by itself at that instant.
  endsAt: t.Number(),
  appealAddress: t.String(),
});

export const RootGet = {
  Response: t.Object({
    // Newest first.
    voidedDuels: t.Array(voidedDuel),
    // Null when the Player is not suspended.
    suspension: t.Nullable(suspension),
  }),
};
