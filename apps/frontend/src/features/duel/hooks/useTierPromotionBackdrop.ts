import type { CSSProperties } from "react";
import type { CustomPropertyStyle } from "../../../shared/lib/customPropertyStyle.ts";
import type { PromotedTier } from "../rank/tierPromotion.ts";
import { BURST_FILL_CLASS_NAMES } from "../scene/burstFills.ts";
import { TIER_SCENES } from "../scene/tierScenes.ts";

const FAINT_RAY_FILLS = {
  tier: "fill-(--rank-up-tier) [fill-opacity:0.07]",
  action: "fill-action [fill-opacity:0.08]",
} as const;

const raysStyle = (at: number, spin: number): CustomPropertyStyle => ({
  "--rays-at": `${at}s`,
  "--rays-spin": `${spin}s`,
});

/** The grid, the rain, the rays and the stars a Tier's scene draws behind everything else. */
export function useTierPromotionBackdrop(tier: PromotedTier) {
  const { at, rays, grid, rain, stars } = TIER_SCENES[tier].effects;
  return {
    gridSquareStyles: (grid ?? []).map(({ x, y, delay }): CSSProperties => ({
      left: `${x}px`,
      top: `${y}px`,
      animationDelay: `${delay}s`,
    })),
    rain: (rain ?? []).map(({ x, size, duration, delay, fill }) => ({
      fillClassName: BURST_FILL_CLASS_NAMES[fill],
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
            faintClassName: FAINT_RAY_FILLS[rays.faintFill ?? "tier"],
          },
    starStyles: (stars ?? []).map(({ x, y, duration, delay }): CSSProperties => ({
      left: `${x}px`,
      top: `${y}px`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
    })),
  };
}
