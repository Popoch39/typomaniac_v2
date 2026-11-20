import {
  type Db,
  duel,
  duelParticipant,
  gameAnalysis,
  review,
  standing,
  suspicion,
  type Transaction,
  user,
} from "@repo/db";
import {
  PODIUM_POSITIONS,
  readDuelSignals,
  reviewToOpen,
  SIGNALS_VERSION,
  SUSPICION_GAMES,
  SUSPICION_THRESHOLD,
} from "@repo/fair-play-engine";
import { ladderIndex } from "@repo/ranked-engine";
import { and, asc, desc, eq, gt, gte, isNotNull, isNull } from "drizzle-orm";
import { recentDuels } from "./analysis.ts";

const MASTER_LADDER_INDEX = ladderIndex({ tier: "master", lp: 0 });

// A banned Player has left the Leaderboard and has nothing left to review.
const notBanned = isNull(user.bannedAt);

/**
 * Opens a Review for every Player one is due for at `at` (REVIEW-1 to REVIEW-4), one Player per
 * transaction. The Players looked at are those who could be due: on the Podium, in Master, or whose
 * Suspicion over their recent Games passes the threshold, which the Suspicion over the Games played
 * since their last settled Review never exceeds. A Player under Review is told nothing.
 */
export const openReviews = async (db: Db, at: Date) => {
  // The Leaderboard's order, without the banned Players it leaves out.
  const podium = await db
    .select({ playerId: standing.playerId })
    .from(standing)
    .innerJoin(user, eq(user.id, standing.playerId))
    .where(and(isNotNull(standing.ladderIndex), notBanned))
    .orderBy(
      desc(standing.ladderIndex),
      desc(standing.lp),
      desc(standing.mmr),
      asc(standing.playerId),
    )
    .limit(PODIUM_POSITIONS);
  const masters = await db
    .select({ playerId: standing.playerId })
    .from(standing)
    .innerJoin(user, eq(user.id, standing.playerId))
    .where(and(gte(standing.ladderIndex, MASTER_LADDER_INDEX), notBanned));
  const suspected = await db
    .select({ playerId: suspicion.playerId })
    .from(suspicion)
    .innerJoin(user, eq(user.id, suspicion.playerId))
    .where(and(gt(suspicion.value, SUSPICION_THRESHOLD), notBanned));
  const positions = new Map(podium.map(({ playerId }, index) => [playerId, index + 1]));
  const inMaster = new Set(masters.map(({ playerId }) => playerId));
  const candidates = new Set([
    ...positions.keys(),
    ...inMaster,
    ...suspected.map((s) => s.playerId),
  ]);
  for (const playerId of candidates)
    await db.transaction((tx) =>
      openReviewIn(tx, {
        playerId,
        master: inMaster.has(playerId),
        position: positions.get(playerId) ?? null,
        at,
      }),
    );
};

const openReviewIn = async (
  tx: Transaction,
  {
    playerId,
    master,
    position,
    at,
  }: { playerId: string; master: boolean; position: number | null; at: Date },
) => {
  // Locked first, so that two passes opening a Review for one Player wait on each other and the
  // second sees the first.
  await tx.select({ id: user.id }).from(user).where(eq(user.id, playerId)).for("update");
  const reviews = await tx
    .select({ reason: review.reason, settledAt: review.settledAt })
    .from(review)
    .where(eq(review.playerId, playerId));
  const lastSettledAt = reviews.reduce<Date | null>(
    (last, { settledAt }) => (settledAt && (!last || settledAt > last) ? settledAt : last),
    null,
  );
  const recent = await tx
    .select({ signals: gameAnalysis.signals })
    .from(gameAnalysis)
    .innerJoin(duel, eq(duel.id, gameAnalysis.duelId))
    .innerJoin(
      duelParticipant,
      and(
        eq(duelParticipant.duelId, gameAnalysis.duelId),
        eq(duelParticipant.seat, gameAnalysis.seat),
      ),
    )
    .where(
      and(
        eq(duelParticipant.playerId, playerId),
        eq(gameAnalysis.signalsVersion, SIGNALS_VERSION),
        lastSettledAt ? gt(duel.startedAt, lastSettledAt) : undefined,
      ),
    )
    .orderBy(desc(duel.endedAt), desc(gameAnalysis.round))
    .limit(SUSPICION_GAMES);
  const reason = reviewToOpen({
    underReview: reviews.some(({ settledAt }) => settledAt === null),
    reasonsOpenedBefore: reviews.map((opened) => opened.reason),
    master,
    position,
    gamesSinceLastReview: recent.map(({ signals }) => signals),
    duelSignalsSinceLastReview: readDuelSignals(await recentDuels(tx, playerId, at, lastSettledAt)),
  });
  if (reason) await tx.insert(review).values({ playerId, reason, openedAt: at });
};
