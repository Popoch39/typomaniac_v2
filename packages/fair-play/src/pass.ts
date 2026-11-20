import { type Db, duel, type Transaction, user, violation } from "@repo/db";
import { nextViolationSanction } from "@repo/fair-play-engine";
import { and, countDistinct, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { analyseGames } from "./analysis.ts";
import { openReviews } from "./review.ts";
import { banPlayerIn, suspendPlayerIn, voidDuelForViolation } from "./sanction.ts";

/**
 * One pass of the fair-play worker at the instant `now`, which it reads no clock for. Every step is
 * its own transaction and idempotent, so a pass that fails half way, or one run twice, leaves the
 * same database as one that ran once.
 */
export const runFairPlayPass = async (db: Db, now: number) => {
  await sanctionViolations(db, new Date(now));
  // Suspicion never sanctions: the analysis only reads Games and saves what their signals say.
  await analyseGames(db, new Date(now));
  await openReviews(db, new Date(now));
};

// Sanctions, one Player and one Duel at a time and in the order the Duels ended, the Violations whose
// Duel was saved by `at`. A Violation whose Duel is not saved yet is left for a later pass.
const sanctionViolations = async (db: Db, at: Date) => {
  const pending = await db
    .selectDistinct({
      playerId: violation.playerId,
      duelId: violation.duelId,
      endedAt: duel.endedAt,
    })
    .from(violation)
    .innerJoin(duel, eq(duel.id, violation.duelId))
    .where(and(isNull(violation.sanctionedAt), lte(duel.endedAt, at)))
    .orderBy(duel.endedAt, violation.playerId);
  for (const committed of pending)
    await db.transaction((tx) => sanctionDuelViolations(tx, { ...committed, at }));
};

// VIOLATION-1: the Player's Violations in one Duel count as one, sanctioned one step up from those
// sanctioned before. The Sanction starts when the Duel ended, an instant tied to the Violation rather
// than to the pass, so that it covers that Duel too and is the same whichever pass applies it.
const sanctionDuelViolations = async (
  tx: Transaction,
  { playerId, duelId, endedAt, at }: { playerId: string; duelId: string; endedAt: Date; at: Date },
) => {
  // Locked first, so that two passes sanctioning one Player wait on each other and the second sees the first.
  await tx.select({ id: user.id }).from(user).where(eq(user.id, playerId)).for("update");
  const ofDuel = and(eq(violation.playerId, playerId), eq(violation.duelId, duelId));
  const [still] = await tx
    .select({ id: violation.id })
    .from(violation)
    .where(and(ofDuel, isNull(violation.sanctionedAt)))
    .limit(1);
  if (!still) return;
  const [sanctioned] = await tx
    .select({ duels: countDistinct(violation.duelId) })
    .from(violation)
    .where(and(eq(violation.playerId, playerId), isNotNull(violation.sanctionedAt)));
  const due = nextViolationSanction(sanctioned?.duels ?? 0);
  const cause = "violation";
  // A Duel the Player lost is left as it was, but the step is saved as a Sanction all the same.
  if (due.kind === "voided_duel") await voidDuelForViolation(tx, { duelId, playerId, at: endedAt });
  else if (due.kind === "suspension")
    await suspendPlayerIn(tx, { playerId, cause, at: endedAt, lengthMs: due.lengthMs });
  else await banPlayerIn(tx, { playerId, cause, at: endedAt });
  await tx
    .update(violation)
    .set({ sanctionedAt: at })
    .where(and(ofDuel, isNull(violation.sanctionedAt)));
};
