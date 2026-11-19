export type LpBarCell = {
  /** The share of the cell filled, from 0 to 1. */
  readonly fill: number;
  /** The share filled before the LP moved. */
  readonly fromFill: number;
  /** When the fill of the cell starts and stops moving, as shares of the whole sweep from 0 to 1. */
  readonly start: number;
  readonly end: number;
};

const bound = (value: number, max: number) => Math.max(0, Math.min(max, value));

/**
 * The cells of an LP bar, each a slice of the Division's LP, swept from the LP held before to the
 * LP held now at one steady pace: a cell moves only while the sweep crosses its slice, so a gain
 * fills them left to right and a loss empties them right to left.
 */
export function lpBarCells(lp: number, from: number, max: number, count: number): LpBarCell[] {
  const to = bound(lp, max);
  const start = bound(from, max);
  const slice = max / count;
  const sweepAt = (value: number) => (to === start ? 0 : bound((value - start) / (to - start), 1));
  return Array.from({ length: count }, (_, index) => {
    const fillAt = (value: number) => bound(value / slice - index, 1);
    const atLow = sweepAt(index * slice);
    const atHigh = sweepAt((index + 1) * slice);
    return {
      fill: fillAt(to),
      fromFill: fillAt(start),
      start: Math.min(atLow, atHigh),
      end: Math.max(atLow, atHigh),
    };
  });
}
