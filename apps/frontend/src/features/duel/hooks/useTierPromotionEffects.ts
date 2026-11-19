import type { CSSProperties } from "react";
import type { PromotedTier } from "../rank/tierPromotion.ts";
import { GOLD_BURST_AT, GOLD_BURSTS, GOLD_RINGS } from "../scene/goldBursts.ts";
import {
  type Burst,
  type BurstFill,
  SILVER_BURST_AT,
  SILVER_BURSTS,
} from "../scene/silverBursts.ts";

type BurstStyle = CSSProperties & Record<`--${string}`, string>;

const BURST_FILLS: Readonly<Record<BurstFill, string>> = {
  tier: "bg-(--rank-up-tier)",
  ink: "bg-ink",
  action: "bg-action",
};

type TierEffects = {
  /** When the rings and the burst go off, in seconds. */
  readonly at: number;
  /** Each ring, after `at`, in seconds. */
  readonly rings: readonly number[];
  readonly bursts: readonly Burst[];
};

const TIER_EFFECTS: Readonly<Partial<Record<PromotedTier, TierEffects>>> = {
  silver: { at: SILVER_BURST_AT, rings: [0], bursts: SILVER_BURSTS },
  gold: { at: GOLD_BURST_AT, rings: GOLD_RINGS, bursts: GOLD_BURSTS },
};

/** The rings and the burst particles a Tier's scene throws out of the Ornament; none yet above Gold. */
export function useTierPromotionEffects(tier: PromotedTier) {
  const effects = TIER_EFFECTS[tier];
  if (effects === undefined) return null;
  const { at, rings, bursts } = effects;
  return {
    ringStyles: rings.map((delay): CSSProperties => ({ animationDelay: `${at + delay}s` })),
    bursts: bursts.map(({ x, y, delay, duration, size, fill }) => {
      const style: BurstStyle = {
        width: `${size}px`,
        height: `${size}px`,
        "--burst-x": `${x}px`,
        "--burst-y": `${y}px`,
        "--burst-delay": `${at + delay}s`,
        "--burst-duration": `${duration}s`,
      };
      return { fillClassName: BURST_FILLS[fill], style };
    }),
  };
}
