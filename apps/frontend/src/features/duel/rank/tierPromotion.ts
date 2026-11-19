import type { RankedEnd } from "@repo/duel-engine";
import {
  ladderIndex,
  type Ornament,
  type Rank,
  rankAtLadderIndex,
  type Tier,
} from "@repo/ranked-engine";
import { rankName, tierName } from "../../ranked/standing/rankName.ts";

/** Every Tier but Bronze, the only ones a Tier promotion reaches. */
export type PromotedTier = Exclude<Tier, "bronze">;

export type TierPromotion = {
  readonly tier: PromotedTier;
  readonly oldOrnament: NonNullable<Ornament>;
  readonly newOrnament: NonNullable<Ornament>;
  /**
   * Silver is titled by its Rank name, the louder Tiers by their name spelled in keys, with the Rank
   * name on the line under it.
   */
  readonly title:
    | { readonly kind: "name"; readonly name: string }
    | { readonly kind: "keys"; readonly letters: readonly string[]; readonly name: string };
  readonly line: string;
  readonly announcement: string;
};

// The Ornament of the Rank itself, whatever the Player pinned: the scene shows the Tier reached.
const rankOrnament = (rank: Rank): NonNullable<Ornament> => ({
  tier: rank.tier,
  division: rank.tier === "master" ? null : rank.division,
});

/**
 * The Tier promotion a ranked Duel gave the Participant, from their `RankedEnd`: a promotion that
 * lands on Division IV of a Tier above Bronze, or on Master, from Division I of the Tier below.
 * `null` for anything else, a Promotion inside a Tier included.
 */
export function tierPromotion({ rankChange, rank }: RankedEnd): TierPromotion | null {
  if (rankChange !== "promoted" || rank === null || rank.tier === "bronze") return null;
  if (rank.tier !== "master" && rank.division !== 4) return null;
  const oldRank = rankAtLadderIndex(ladderIndex(rank) - 1, 0);
  return {
    tier: rank.tier,
    oldOrnament: rankOrnament(oldRank),
    newOrnament: rankOrnament(rank),
    title:
      rank.tier === "silver"
        ? { kind: "name", name: rankName(rank) }
        : { kind: "keys", letters: tierName(rank.tier).split(""), name: rankName(rank) },
    line: `Promoted from ${rankName(oldRank)}`,
    announcement: `Promoted to ${rankName(rank)}`,
  };
}
