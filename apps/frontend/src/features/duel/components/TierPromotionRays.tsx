import type { CSSProperties } from "react";
import type { Ray } from "../scene/platinumRays.ts";

interface TierPromotionRaysProps {
  style: CSSProperties;
  rays: readonly Ray[];
  /** The fill of every other, fainter ray. */
  faintClassName: string;
}

/** Rays of the Tier colour turning behind the Ornament, centred on it at (520, 260) of the stage. */
export function TierPromotionRays({ style, rays, faintClassName }: TierPromotionRaysProps) {
  return (
    <svg
      width="1800"
      height="1800"
      viewBox="-900 -900 1800 1800"
      className="absolute top-[-640px] left-[-380px] opacity-0 rank-up-rays"
      style={style}
    >
      {rays.map(({ points, isFaint }) => (
        <polygon
          key={points}
          points={points}
          className={isFaint ? faintClassName : "fill-(--rank-up-tier) [fill-opacity:0.13]"}
        />
      ))}
    </svg>
  );
}
