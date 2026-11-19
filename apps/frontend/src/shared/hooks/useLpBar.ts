import type { CSSProperties } from "react";
import { DEFAULT_RANKED_CONFIG } from "@repo/ranked-engine";
import { lpBarCells } from "../lib/lpBarCells.ts";

const CELLS = 10;
// The sweep waits for the end of the Duel to be read before it moves.
const SWEEP_DELAY_MS = 400;
const SWEEP_MS = 900;

type CellStyle = CSSProperties & Record<`--${string}`, string>;

/**
 * Ten cells of a tenth of a Division's LP each, the one at the edge partly filled. Given `from`,
 * the cells sweep from the LP held then to `lp` as the bar appears.
 */
export function useLpBar(lp: number, next: string, from = lp) {
  const max = DEFAULT_RANKED_CONFIG.lpPerDivision;
  const held = Math.max(0, Math.min(max, lp));
  const toNext = max - held;
  return {
    held,
    max,
    toNext,
    cells: lpBarCells(lp, from, max, CELLS).map(({ fill, fromFill, start, end }) => {
      const style: CellStyle = { width: `${fill * 100}%` };
      if (end === start) return { isSwept: false, style };
      return {
        isSwept: true,
        style: {
          ...style,
          "--lp-from": `${fromFill * 100}%`,
          animationDelay: `${SWEEP_DELAY_MS + start * SWEEP_MS}ms`,
          animationDuration: `${(end - start) * SWEEP_MS}ms`,
        },
      };
    }),
    valueText: `${held} of ${max} LP, ${toNext} LP to ${next}`,
  };
}
