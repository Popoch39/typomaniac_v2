import { and, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type Db, duel, duelParticipant, report } from "../../db/client.ts";

const opponentSeat = alias(duelParticipant, "opponent_seat");

/**
 * Saves the Player's Report against their Opponent in a ranked Duel, at `at`: "not-found" when the
 * Player took no part in a saved ranked Duel with this id, or their Opponent has no account any more,
 * and "already-made" when they reported on this Duel before. It only raises Suspicion, at the next
 * fair-play pass.
 */
export const makeReport = async (
  db: Db,
  { duelId, playerId, at }: { duelId: string; playerId: string; at: Date },
): Promise<"made" | "already-made" | "not-found"> => {
  const [seated] = await db
    .select({ opponentId: opponentSeat.playerId })
    .from(duelParticipant)
    .innerJoin(duel, eq(duel.id, duelParticipant.duelId))
    .innerJoin(
      opponentSeat,
      and(
        eq(opponentSeat.duelId, duelParticipant.duelId),
        ne(opponentSeat.seat, duelParticipant.seat),
      ),
    )
    .where(
      and(
        eq(duelParticipant.duelId, duelId),
        eq(duelParticipant.playerId, playerId),
        eq(duel.kind, "ranked"),
      ),
    );
  if (!seated?.opponentId) return "not-found";
  const made = await db
    .insert(report)
    .values({ duelId, reporterId: playerId, reportedId: seated.opponentId, reportedAt: at })
    .onConflictDoNothing({ target: [report.duelId, report.reporterId] })
    .returning({ id: report.id });
  return made.length === 0 ? "already-made" : "made";
};
