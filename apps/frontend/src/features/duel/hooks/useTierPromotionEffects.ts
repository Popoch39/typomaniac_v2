import type { CSSProperties } from "react";
import type { PromotedTier } from "../rank/tierPromotion.ts";
import {
  DIAMOND_BURST_AT,
  DIAMOND_BURSTS,
  DIAMOND_INWARD_RINGS,
  DIAMOND_RINGS,
} from "../scene/diamondBursts.ts";
import { DIAMOND_RAIN, type Drop } from "../scene/diamondRain.ts";
import { GOLD_BURST_AT, GOLD_BURSTS, GOLD_RINGS } from "../scene/goldBursts.ts";
import { type GridSquare, PLATINUM_GRID } from "../scene/platinumGrid.ts";
import { PLATINUM_BURST_AT, PLATINUM_BURSTS, PLATINUM_RINGS } from "../scene/platinumBursts.ts";
import { PLATINUM_RAYS, PLATINUM_RAYS_SPIN, type Ray } from "../scene/platinumRays.ts";
import {
  type Burst,
  type BurstFill,
  SILVER_BURST_AT,
  SILVER_BURSTS,
} from "../scene/silverBursts.ts";

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

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
  /** Rays that fade in at `at` and turn once every `spin` seconds. */
  readonly rays?: { readonly spin: number; readonly rays: readonly Ray[] };
  readonly grid?: readonly GridSquare[];
  /** Rings closing on the old Ornament, each from the opening, in seconds. */
  readonly inwardRings?: readonly number[];
  readonly rain?: readonly Drop[];
};

const TIER_EFFECTS: Readonly<Partial<Record<PromotedTier, TierEffects>>> = {
  silver: { at: SILVER_BURST_AT, rings: [0], bursts: SILVER_BURSTS },
  gold: { at: GOLD_BURST_AT, rings: GOLD_RINGS, bursts: GOLD_BURSTS },
  platinum: {
    at: PLATINUM_BURST_AT,
    rings: PLATINUM_RINGS,
    bursts: PLATINUM_BURSTS,
    rays: { spin: PLATINUM_RAYS_SPIN, rays: PLATINUM_RAYS },
    grid: PLATINUM_GRID,
  },
  // The same rays as Platinum's, as on the canvas.
  diamond: {
    at: DIAMOND_BURST_AT,
    rings: DIAMOND_RINGS,
    bursts: DIAMOND_BURSTS,
    rays: { spin: PLATINUM_RAYS_SPIN, rays: PLATINUM_RAYS },
    inwardRings: DIAMOND_INWARD_RINGS,
    rain: DIAMOND_RAIN,
  },
};

const raysStyle = (at: number, spin: number): CustomStyle => ({
  "--rays-at": `${at}s`,
  "--rays-spin": `${spin}s`,
});

/**
 * The rings and the burst particles a Tier's scene throws out of the Ornament, with the rain, the rays,
 * the grid and the rings closing in behind them; none yet for Master.
 */
export function useTierPromotionEffects(tier: PromotedTier) {
  const effects = TIER_EFFECTS[tier];
  if (effects === undefined) return null;
  const { at, rings, bursts, rays, grid, inwardRings, rain } = effects;
  return {
    rain: (rain ?? []).map(({ x, size, duration, delay, fill }) => ({
      fillClassName: BURST_FILLS[fill],
      style: {
        left: `${x}px`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      } satisfies CSSProperties,
    })),
    rays:
      rays === undefined
        ? null
        : {
            style: raysStyle(at, rays.spin),
            rays: rays.rays,
          },
    gridSquareStyles: (grid ?? []).map(({ x, y, delay }): CSSProperties => ({
      left: `${x}px`,
      top: `${y}px`,
      animationDelay: `${delay}s`,
    })),
    inwardRingStyles: (inwardRings ?? []).map((delay): CSSProperties => ({
      animationDelay: `${delay}s`,
    })),
    ringStyles: rings.map((delay): CSSProperties => ({ animationDelay: `${at + delay}s` })),
    bursts: bursts.map(({ x, y, delay, duration, size, fill }) => {
      const style: CustomStyle = {
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
