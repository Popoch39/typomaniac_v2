import { and, desc, eq, gt, isNull, lte, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  type Db,
  duelParticipant,
  sanction,
  user,
  voidedDuel,
  voidedDuelCorrection,
} from "../../db/client.ts";

// The steps that apply a Sanction live in @repo/fair-play, shared with the fair-play worker: this is
// their one import path in the API.
export { banPlayer, runFairPlayPass, suspendPlayer, voidDuel } from "@repo/fair-play";
export type { BanResult, SanctionCause, SuspendResult, VoidDuelResult } from "@repo/fair-play";

/**
 * The end of the Player's current Suspension, as epoch milliseconds, or null when none holds at
 * `now`: one has started, is not revoked and has not ended. The latest end wins when several overlap.
 */
export const readCurrentSuspension = async (db: Db, playerId: string, now: Date) => {
  const [current] = await db
    .select({ endsAt: sanction.endsAt })
    .from(sanction)
    .where(
      and(
        eq(sanction.playerId, playerId),
        eq(sanction.kind, "suspension"),
        isNull(sanction.revokedAt),
        lte(sanction.startedAt, now),
        gt(sanction.endsAt, now),
      ),
    )
    .orderBy(desc(sanction.endsAt))
    .limit(1);
  return current?.endsAt ? { endsAt: current.endsAt.getTime() } : null;
};

const opponentSeat = alias(duelParticipant, "opponent_seat");

/**
 * The Voided Duels the Player sat in, newest first: when each was voided, against whom, whether that
 * Opponent has since been banned, and the LP it gave them back or took from them. Never the MMR
 * (ADR 0006), nor who was at fault or why.
 */
export const readOwnVoidedDuels = async (db: Db, playerId: string) => {
  const rows = await db
    .select({
      duelId: voidedDuelCorrection.duelId,
      voidedAt: sanction.startedAt,
      opponentNickname: user.nickname,
      opponentBannedAt: user.bannedAt,
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
  return rows.map(({ voidedAt, opponentBannedAt, ...row }) => ({
    ...row,
    voidedAt: voidedAt.getTime(),
    opponentBanned: opponentBannedAt !== null,
  }));
};
