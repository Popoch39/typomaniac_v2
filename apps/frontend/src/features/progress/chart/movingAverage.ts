/**
 * Each item with the average of its value and those of the items before it, at most `span` items in
 * all: the trend of a noisy series. Before `span` items are in, each averages every item so far.
 */
export function movingAverage<T>(
  items: readonly T[],
  span: number,
  valueOf: (item: T) => number,
): { item: T; average: number }[] {
  return items.map((item, index) => {
    const window = items.slice(Math.max(0, index - span + 1), index + 1);
    return { item, average: window.reduce((sum, each) => sum + valueOf(each), 0) / window.length };
  });
}
