import {
  type Db,
  duelParticipant,
  sanction,
  type Transaction,
  voidedDuel,
  voidedDuelCorrection,
} from "@repo/db";
import { and, eq } from "drizzle-orm";
import { setBannedMark } from "./sanction.ts";
import { correctStandings } from "./standing.ts";

export type RevokeSanctionResult = "revoked" | "already-revoked" | "not-found";

/**
 * Revokes a Sanction at `at`, after an appeal, in one transaction: a Suspension ends at once, a Ban
 * is lifted with the identities it refused, and every Duel the Sanction voided gets the inverse of the
 * correction it was given, on the Standings as they are now, and counts again. The Sanction is kept,
 * marked as revoked, so that revoking it again changes nothing.
 */
export const revokeSanction = (
  db: Db,
  { sanctionId, at }: { sanctionId: string; at: Date },
): Promise<RevokeSanctionResult> =>
  db.transaction(async (tx) => {
    // Locked first, so that two revocations of one Sanction wait on each other and the second sees the first.
    const [found] = await tx
      .select({ playerId: sanction.playerId, kind: sanction.kind, revokedAt: sanction.revokedAt })
      .from(sanction)
      .where(eq(sanction.id, sanctionId))
      .for("update");
    if (!found) return "not-found";
    if (found.revokedAt) return "already-revoked";
    await tx.update(sanction).set({ revokedAt: at }).where(eq(sanction.id, sanctionId));
    // The identities a Ban refused are refused only under a Ban not revoked, so they are lifted with it.
    if (found.kind === "ban") await setBannedMark(tx, found.playerId, null);
    await restoreVoidedDuels(tx, sanctionId);
    return "revoked";
  });

// Gives each Duel the Sanction voided the inverse of its correction, then forgets the voiding, so that
// the Duel counts again and a later Sanction may void it.
const restoreVoidedDuels = async (tx: Transaction, sanctionId: string) => {
  const corrections = await tx
    .select({
      duelId: voidedDuelCorrection.duelId,
      playerId: duelParticipant.playerId,
      mmr: voidedDuelCorrection.mmr,
      lp: voidedDuelCorrection.lp,
    })
    .from(voidedDuelCorrection)
    .innerJoin(voidedDuel, eq(voidedDuel.duelId, voidedDuelCorrection.duelId))
    .innerJoin(
      duelParticipant,
      and(
        eq(duelParticipant.duelId, voidedDuelCorrection.duelId),
        eq(duelParticipant.seat, voidedDuelCorrection.seat),
      ),
    )
    .where(eq(voidedDuel.sanctionId, sanctionId))
    .orderBy(voidedDuelCorrection.duelId, voidedDuelCorrection.seat);
  // One Duel at a time: a Player in several of them is corrected from the Standing the last one left.
  for (const duelId of new Set(corrections.map((c) => c.duelId)))
    await correctStandings(
      tx,
      corrections.flatMap((c) =>
        // A seat whose Player has since deleted their account has nobody left to correct.
        c.duelId !== duelId || c.playerId === null
          ? []
          : [{ playerId: c.playerId, correction: { mmr: -c.mmr, lp: -c.lp } }],
      ),
    );
  await tx.delete(voidedDuel).where(eq(voidedDuel.sanctionId, sanctionId));
};
