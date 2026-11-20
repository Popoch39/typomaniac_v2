import type { ReactNode } from "react";
import { describeDuelEnd } from "../chart/describeDuelEnd.ts";
import type { HoveredPoint } from "../chart/hoveredPoint.ts";

/** The title of a hovered point's tooltip: the end of its Game's Duel. */
export function useProgressTooltipLabel() {
  return (_label: ReactNode, [point]: readonly HoveredPoint[]) => {
    const endedAt = point?.payload?.endedAt;
    return endedAt === undefined ? null : describeDuelEnd(endedAt);
  };
}
