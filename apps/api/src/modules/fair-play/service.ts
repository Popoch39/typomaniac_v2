import { SIGNAL_NAMES } from "@repo/fair-play-engine";
import { and, asc, desc, eq, gt, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  type Db,
  duel,
  duelGame,
  duelParticipant,
  duelRound,
  gameAnalysis,
  report,
  review,
  sanction,
  suspicion,
  user,
  voidedDuel,
  violation,
  voidedDuelCorrection,
} from "../../db/client.ts";
import { readStanding } from "../standing/service.ts";

// The steps that apply a Sanction live in @repo/fair-play, shared with the fair-play worker: this is
// their one import path in the API.
export {
  banPlayer,
  revokeSanction,
  runFairPlayPass,
  settleReview,
  suspendPlayer,
  voidDuel,
} from "@repo/fair-play";
export type {
  BanResult,
  ReviewSettlement,
  RevokeSanctionResult,
  SanctionCause,
  SettleReviewResult,
  SuspendResult,
  VoidDuelResult,
} from "@repo/fair-play";

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
 * Saves the Player's Report against their Opponent in a ranked Duel, at `at`: "not_found" when the
 * Player took no part in a saved ranked Duel with this id, or their Opponent has no account any more,
 * and "already_made" when they reported on this Duel before. It only raises Suspicion, at the next
 * fair-play pass.
 */
export const makeReport = async (
  db: Db,
  { duelId, playerId, at }: { duelId: string; playerId: string; at: Date },
): Promise<"made" | "already_made" | "not_found"> => {
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
  if (!seated?.opponentId) return "not_found";
  const made = await db
    .insert(report)
    .values({ duelId, reporterId: playerId, reportedId: seated.opponentId, reportedAt: at })
    .onConflictDoNothing({ target: [report.duelId, report.reporterId] })
    .returning({ id: report.id });
  return made.length === 0 ? "already_made" : "made";
};

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

/**
 * The open Reviews, the administrator's queue: highest Suspicion first, so that the worst is looked at
 * first, then a Review without a Suspicion yet, the oldest first among equals.
 */
export const readOpenReviews = async (db: Db) => {
  const rows = await db
    .select({
      id: review.id,
      playerId: review.playerId,
      nickname: user.nickname,
      reason: review.reason,
      openedAt: review.openedAt,
      suspicion: suspicion.value,
    })
    .from(review)
    .innerJoin(user, eq(user.id, review.playerId))
    .leftJoin(suspicion, eq(suspicion.playerId, review.playerId))
    .where(isNull(review.settledAt))
    .orderBy(sql`${suspicion.value} desc nulls last`, asc(review.openedAt), asc(review.id));
  return rows.map(({ openedAt, ...row }) => ({ ...row, openedAt: openedAt.getTime() }));
};

// How many of the reviewed Player's ranked Duels a Review shows, newest first.
export const REVIEW_RECENT_DUELS = 20;

/**
 * A Review as the administrator reads it, or null when there is none with this id: the Player, their
 * Suspicion and whole Standing, their recent ranked Duels with what each signal said of each Game and
 * what it is replayed from,
 * their Violations and every Sanction they were given, revoked ones included.
 */
export const readReview = async (db: Db, reviewId: string) => {
  const [found] = await db
    .select({
      id: review.id,
      reason: review.reason,
      openedAt: review.openedAt,
      playerId: user.id,
      nickname: user.nickname,
      bannedAt: user.bannedAt,
      suspicion: suspicion.value,
    })
    .from(review)
    .innerJoin(user, eq(user.id, review.playerId))
    .leftJoin(suspicion, eq(suspicion.playerId, review.playerId))
    .where(eq(review.id, reviewId));
  if (!found) return null;
  const { playerId } = found;
  const [standing, duels, violations, sanctions, reports] = await Promise.all([
    readStanding(db, playerId),
    readReviewedDuels(db, playerId),
    db
      .select({
        duelId: violation.duelId,
        round: violation.round,
        kind: violation.kind,
        committedAt: violation.committedAt,
      })
      .from(violation)
      .where(eq(violation.playerId, playerId))
      .orderBy(desc(violation.committedAt)),
    readSanctions(db, playerId),
    readReviewedReports(db, playerId),
  ]);
  return {
    id: found.id,
    reason: found.reason,
    openedAt: found.openedAt.getTime(),
    player: { id: playerId, nickname: found.nickname, banned: found.bannedAt !== null },
    suspicion: found.suspicion,
    standing,
    duels,
    violations: violations.map(({ committedAt, ...row }) => ({
      ...row,
      committedAt: committedAt.getTime(),
    })),
    sanctions,
    reports,
  };
};

// Every Sanction of the Player, revoked ones included, newest first.
const readSanctions = async (db: Db, playerId: string) => {
  const rows = await db
    .select({
      id: sanction.id,
      kind: sanction.kind,
      cause: sanction.cause,
      startedAt: sanction.startedAt,
      endsAt: sanction.endsAt,
      revokedAt: sanction.revokedAt,
    })
    .from(sanction)
    .where(eq(sanction.playerId, playerId))
    .orderBy(desc(sanction.startedAt), asc(sanction.id));
  return rows.map(({ startedAt, endsAt, revokedAt, ...row }) => ({
    ...row,
    startedAt: startedAt.getTime(),
    endsAt: endsAt?.getTime() ?? null,
    revokedAt: revokedAt?.getTime() ?? null,
  }));
};

/**
 * Every Sanction of a Player, revoked ones included, newest first, for the administrator to revoke one
 * after an appeal; null when there is no such Player.
 */
export const readPlayerSanctions = async (db: Db, playerId: string) => {
  const [found] = await db.select({ id: user.id }).from(user).where(eq(user.id, playerId));
  return found ? readSanctions(db, playerId) : null;
};

// The Reports made against the Player, newest first, with the Duel each concerns and who made it.
const readReviewedReports = async (db: Db, playerId: string) => {
  const rows = await db
    .select({
      duelId: report.duelId,
      reporterNickname: user.nickname,
      reportedAt: report.reportedAt,
    })
    .from(report)
    .innerJoin(user, eq(user.id, report.reporterId))
    .where(eq(report.reportedId, playerId))
    .orderBy(desc(report.reportedAt), asc(report.id));
  return rows.map(({ reportedAt, ...row }) => ({ ...row, reportedAt: reportedAt.getTime() }));
};

// The Player's recent ranked Duels, newest first, each with its Games in Round order.
const readReviewedDuels = async (db: Db, playerId: string) => {
  const duels = await db
    .select({
      duelId: duelParticipant.duelId,
      seat: duelParticipant.seat,
      endedAt: duel.endedAt,
      outcome: duelParticipant.outcome,
      lpDelta: duelParticipant.lpDelta,
      opponentNickname: user.nickname,
    })
    .from(duelParticipant)
    .innerJoin(duel, eq(duel.id, duelParticipant.duelId))
    .leftJoin(
      opponentSeat,
      and(
        eq(opponentSeat.duelId, duelParticipant.duelId),
        ne(opponentSeat.seat, duelParticipant.seat),
      ),
    )
    .leftJoin(user, eq(user.id, opponentSeat.playerId))
    .where(and(eq(duelParticipant.playerId, playerId), eq(duel.kind, "ranked")))
    .orderBy(desc(duel.endedAt), asc(duel.id))
    .limit(REVIEW_RECENT_DUELS);
  const games =
    duels.length === 0
      ? []
      : await db
          .select({
            duelId: duelGame.duelId,
            round: duelGame.round,
            seat: duelGame.seat,
            outcome: duelGame.outcome,
            signals: gameAnalysis.signals,
            words: duelRound.words,
            journal: duelGame.journal,
            result: duelGame.result,
          })
          .from(duelGame)
          .innerJoin(
            duelRound,
            and(eq(duelRound.duelId, duelGame.duelId), eq(duelRound.round, duelGame.round)),
          )
          .leftJoin(
            gameAnalysis,
            and(
              eq(gameAnalysis.duelId, duelGame.duelId),
              eq(gameAnalysis.round, duelGame.round),
              eq(gameAnalysis.seat, duelGame.seat),
            ),
          )
          .where(
            inArray(
              duelGame.duelId,
              duels.map(({ duelId }) => duelId),
            ),
          )
          .orderBy(asc(duelGame.round));
  return duels.map(({ duelId, seat, endedAt, ...row }) => ({
    duelId,
    endedAt: endedAt.getTime(),
    ...row,
    games: games
      .filter((game) => game.duelId === duelId && game.seat === seat)
      .map(({ round, outcome, signals, words, journal, result }) => ({
        round,
        outcome,
        signals: signals && SIGNAL_NAMES.map((name) => ({ name, value: signals[name] })),
        words,
        journal,
        result,
      })),
  }));
};
