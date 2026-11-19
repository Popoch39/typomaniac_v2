import type { CSSProperties } from "react";
import { cn } from "../../../shared/lib/utils.ts";

interface TierPromotionRainProps {
  drops: readonly { fillClassName: string; style: CSSProperties }[];
}

/** Pixels falling across the whole stage, from above its top edge, for as long as the scene stays open. */
export function TierPromotionRain({ drops }: TierPromotionRainProps) {
  return drops.map(({ fillClassName, style }, index) => (
    <span
      key={index}
      className={cn(
        "absolute top-[-24px] border-2 border-key-outline opacity-0 rank-up-rain",
        fillClassName,
      )}
      style={style}
    />
  ));
}
