import { and, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  type Db,
  duel,
  duelParticipant,
  sanction,
  user,
  voidedDuel,
  voidedDuelCorrection,
} from "../../db/client.ts";
import { correctStandings, storedRank } from "../standing/service.ts";

/** What brought a Sanction: a Violation, sanctioned automatically, or a Review settled by a person. */
export type SanctionCause = "violation" | "review";

export type VoidDuelResult = "voided" | "already-voided" | "not-won" | "not-found";

/**
 * Voids a ranked Duel the Player at fault won (ADR 0015), in one transaction: a Sanction of kind
 * Voided Duel is saved, the Player at fault loses the MMR and LP they won in it and their Opponent
 * gets back what they lost, both on their Standing as it is now. A Duel the Player at fault lost or
 * drew is left alone, and a Duel voided already is never corrected again. `"not-found"` for a Duel
 * that is not a saved ranked Duel of this Player.
 */
export const voidDuel = (
  db: Db,
  {
    duelId,
    playerId,
    cause,
    at,
  }: { duelId: string; playerId: string; cause: SanctionCause; at: Date },
): Promise<VoidDuelResult> =>
  db.transaction(async (tx) => {
    // Locked first, so that two voidings of one Duel wait on each other and the second sees the first.
    const [found] = await tx
      .select({ kind: duel.kind })
      .from(duel)
      .where(eq(duel.id, duelId))
      .for("update");
    if (found?.kind !== "ranked") return "not-found";
    const participants = await tx
      .select()
      .from(duelParticipant)
      .where(eq(duelParticipant.duelId, duelId))
      .orderBy(duelParticipant.seat);
    const atFault = participants.find((participant) => participant.playerId === playerId);
    if (!atFault) return "not-found";
    const [voided] = await tx
      .select({ duelId: voidedDuel.duelId })
      .from(voidedDuel)
      .where(eq(voidedDuel.duelId, duelId));
    if (voided) return "already-voided";
    if (atFault.outcome !== "win") return "not-won";
    // A seat whose Player has since deleted their account has nobody left to correct.
    const corrected = participants.flatMap(({ seat, playerId: id, mmrBefore, mmrAfter, lpDelta }) =>
      id === null || mmrBefore === null || mmrAfter === null || lpDelta === null
        ? []
        : [{ seat, playerId: id, correction: { mmr: mmrBefore - mmrAfter, lp: -lpDelta } }],
    );
    const applied = await correctStandings(tx, corrected);
    const [saved] = await tx
      .insert(sanction)
      .values({ playerId, kind: "voided_duel", cause, startedAt: at })
      .returning({ id: sanction.id });
    if (!saved) throw new Error(`Could not save the Sanction voiding Duel ${duelId}`);
    await tx.insert(voidedDuel).values({ duelId, sanctionId: saved.id });
    await tx.insert(voidedDuelCorrection).values(
      corrected.map(({ seat }, index) => {
        const { correction, standing } = applied[index] ?? {};
        if (!correction || !standing)
          throw new Error(`Seat ${seat} of Duel ${duelId} was not corrected`);
        return {
          duelId,
          seat,
          ...correction,
          ladderIndexAfter: storedRank(standing.rank).ladderIndex,
        };
      }),
    );
    return "voided";
  });

const opponentSeat = alias(duelParticipant, "opponent_seat");

/**
 * The Voided Duels the Player sat in, newest first: when each was voided, against whom, and the LP
 * it gave them back or took from them. Never the MMR (ADR 0006), nor who was at fault or why.
 */
export const readOwnVoidedDuels = async (db: Db, playerId: string) => {
  const rows = await db
    .select({
      duelId: voidedDuelCorrection.duelId,
      voidedAt: sanction.startedAt,
      opponentNickname: user.nickname,
      lp: voidedDuelCorrection.lp,
    })
    .from(voidedDuelCorrection)
    .innerJoin(
      duelParticipant,
      and(
        eq(duelParticipant.duelId, voidedDuelCorrection.duelId),
        eq(duelParticipant.seat, voidedDuelCorrection.seat),
      ),
    )
    .innerJoin(voidedDuel, eq(voidedDuel.duelId, voidedDuelCorrection.duelId))
    .innerJoin(sanction, eq(sanction.id, voidedDuel.sanctionId))
    .leftJoin(
      opponentSeat,
      and(
        eq(opponentSeat.duelId, voidedDuelCorrection.duelId),
        ne(opponentSeat.seat, voidedDuelCorrection.seat),
      ),
    )
    .leftJoin(user, eq(user.id, opponentSeat.playerId))
    .where(eq(duelParticipant.playerId, playerId))
    .orderBy(desc(sanction.startedAt));
  return rows.map(({ voidedAt, ...row }) => ({ ...row, voidedAt: voidedAt.getTime() }));
};
