import { type Db, duel, duelParticipant, review, sanction } from "@repo/db";
import { suspensionLength } from "@repo/fair-play-engine";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { banPlayerIn, type SeveredRelations, suspendPlayerIn, voidDuelIn } from "./sanction.ts";

/** How the administrator ends a Review: clearing the Player, or one of the Sanctions. */
export type ReviewSettlement =
  | { readonly decision: "cleared" }
  | { readonly decision: "voided_duels"; readonly duelIds: readonly string[] }
  | { readonly decision: "suspension" }
  | { readonly decision: "ban" };

/**
 * A settled Review, with the Player its Ban banned and what the Ban deleted around them, for telling
 * the other sides; `banned` is null for any other decision, or a Player banned already.
 */
export type SettledReview = {
  readonly banned: ({ readonly playerId: string } & SeveredRelations) | null;
};

export type SettleReviewResult = SettledReview | "not-found" | "already-settled" | "duel-not-found";

/**
 * Settles an open Review at `at`, in one transaction: the Sanction decided is applied with cause
 * Review, through the same steps as an automatic one, and the Review is closed with that decision. A
 * clearing applies nothing. A Review settled already is left as it is, and so is everything when one
 * of the Duels to void is not a saved ranked Duel of the reviewed Player (`"duel-not-found"`). A
 * Duel the Player lost or drew, or one voided already, is left alone (ADR 0015).
 */
export const settleReview = (
  db: Db,
  { reviewId, settlement, at }: { reviewId: string; settlement: ReviewSettlement; at: Date },
): Promise<SettleReviewResult> =>
  db.transaction(async (tx) => {
    // Locked first, so that two settlings of one Review wait on each other and the second sees the first.
    const [found] = await tx
      .select({ playerId: review.playerId, settledAt: review.settledAt })
      .from(review)
      .where(eq(review.id, reviewId))
      .for("update");
    if (!found) return "not-found";
    if (found.settledAt) return "already-settled";
    const { playerId } = found;
    const cause = "review";
    let banned: SettledReview["banned"] = null;
    if (settlement.decision === "voided_duels") {
      const duelIds = [...new Set(settlement.duelIds)];
      const [ofPlayer] = await tx
        .select({ duels: count() })
        .from(duelParticipant)
        .innerJoin(duel, eq(duel.id, duelParticipant.duelId))
        .where(
          and(
            eq(duelParticipant.playerId, playerId),
            eq(duel.kind, "ranked"),
            inArray(duelParticipant.duelId, duelIds),
          ),
        );
      if (ofPlayer?.duels !== duelIds.length) return "duel-not-found";
      for (const duelId of duelIds) await voidDuelIn(tx, { duelId, playerId, cause, at });
    } else if (settlement.decision === "suspension") {
      const [earlier] = await tx
        .select({ suspensions: count() })
        .from(sanction)
        .where(
          and(
            eq(sanction.playerId, playerId),
            eq(sanction.kind, "suspension"),
            isNull(sanction.revokedAt),
          ),
        );
      const lengthMs = suspensionLength(earlier?.suspensions ?? 0);
      await suspendPlayerIn(tx, { playerId, cause, at, lengthMs });
    } else if (settlement.decision === "ban") {
      const { severed } = await banPlayerIn(tx, { playerId, cause, at });
      if (severed !== null) banned = { playerId, ...severed };
    }
    await tx
      .update(review)
      .set({ settledAt: at, decision: settlement.decision })
      .where(eq(review.id, reviewId));
    return { banned };
  });
