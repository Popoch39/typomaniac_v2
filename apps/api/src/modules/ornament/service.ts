import {
  isOrnamentUnlocked,
  type Ornament,
  type OrnamentChoice,
  type Tier,
  tierAtLadderIndex,
  wornOrnament,
} from "@repo/ranked-engine";
import { and, eq, inArray, max } from "drizzle-orm";
import { type Db, duelParticipant, standing, user, voidedDuelCorrection } from "../../db/client.ts";
import { rankFromStored } from "../standing/service.ts";

/** The Ornament each of these Players wears, from their choice and their current Rank, by Player id. */
export const readWornOrnaments = async (
  db: Db,
  playerIds: readonly string[],
): Promise<Map<string, Ornament>> => {
  if (playerIds.length === 0) return new Map();
  // A Player who never played ranked has no Standing row and is Unranked.
  const rows = await db
    .select({
      playerId: user.id,
      choice: user.ornament,
      ladderIndex: standing.ladderIndex,
      lp: standing.lp,
    })
    .from(user)
    .leftJoin(standing, eq(standing.playerId, user.id))
    .where(inArray(user.id, [...playerIds]));
  return new Map(
    rows.map(({ playerId, choice, ladderIndex, lp }) => [
      playerId,
      wornOrnament(choice, rankFromStored(ladderIndex, lp)),
    ]),
  );
};

// Read from the ranked Duels played and the corrections of Voided Duels rather than the Standing, so
// neither a demotion nor a correction ever lowers it (CORRECT-5).
/** The highest Tier the Player reached after any ranked Duel or correction, `null` before their first Rank. */
export const readPeakTier = async (db: Db, playerId: string): Promise<Tier | null> => {
  const [[played], [corrected]] = await Promise.all([
    db
      .select({ peakIndex: max(duelParticipant.ladderIndexAfter) })
      .from(duelParticipant)
      .where(eq(duelParticipant.playerId, playerId)),
    db
      .select({ peakIndex: max(voidedDuelCorrection.ladderIndexAfter) })
      .from(voidedDuelCorrection)
      .innerJoin(
        duelParticipant,
        and(
          eq(duelParticipant.duelId, voidedDuelCorrection.duelId),
          eq(duelParticipant.seat, voidedDuelCorrection.seat),
        ),
      )
      .where(eq(duelParticipant.playerId, playerId)),
  ]);
  const reached = [played?.peakIndex, corrected?.peakIndex].filter(
    (index): index is number => index !== null && index !== undefined,
  );
  return reached.length === 0 ? null : tierAtLadderIndex(Math.max(...reached));
};

/** What the Player chose to wear, the Peak Tier that bounds their choice, and what they wear. */
export const readOwnOrnament = async (db: Db, playerId: string) => {
  const [[row], peakTier, worn] = await Promise.all([
    db.select({ choice: user.ornament }).from(user).where(eq(user.id, playerId)),
    readPeakTier(db, playerId),
    readWornOrnaments(db, [playerId]),
  ]);
  return {
    choice: row?.choice ?? "auto",
    peakTier,
    worn: worn.get(playerId) ?? null,
  };
};

export type SaveOrnamentChoiceResult = "saved" | "locked";

export const saveOrnamentChoice = async (
  db: Db,
  playerId: string,
  choice: OrnamentChoice,
): Promise<SaveOrnamentChoiceResult> => {
  if (!isOrnamentUnlocked(choice, await readPeakTier(db, playerId))) return "locked";
  await db.update(user).set({ ornament: choice }).where(eq(user.id, playerId));
  return "saved";
};
