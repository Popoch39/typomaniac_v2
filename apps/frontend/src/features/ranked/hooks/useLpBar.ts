import { DEFAULT_RANKED_CONFIG } from "@repo/ranked-engine";

const CELLS = 10;

/** Ten cells of a tenth of a Division's LP each, the one at the edge partly filled. */
export function useLpBar(lp: number, next: string) {
  const max = DEFAULT_RANKED_CONFIG.lpPerDivision;
  const held = Math.max(0, Math.min(max, lp));
  const toNext = max - held;
  return {
    held,
    max,
    toNext,
    cellFills: Array.from({ length: CELLS }, (_, index) =>
      Math.max(0, Math.min(1, (held / max) * CELLS - index)),
    ),
    valueText: `${held} of ${max} LP, ${toNext} LP to ${next}`,
  };
}
