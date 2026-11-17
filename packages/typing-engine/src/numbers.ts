export function wordsPerMinute(chars: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return chars / 5 / (seconds / 60);
}

export function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** How regular a series is, from 100 (constant) down to 0. An empty or all-zero series gives 0. */
export function consistency(series: readonly number[]): number {
  const mean = series.reduce((total, value) => total + value, 0) / series.length;
  const variance = series.reduce((total, value) => total + (value - mean) ** 2, 0) / series.length;
  const variation = Math.sqrt(variance) / mean;
  const regularity = 100 * (1 - Math.tanh(variation + variation ** 3 / 3 + variation ** 5 / 5));
  // An empty series or a zero mean divides 0 by 0: the consistency is then undefined.
  return Number.isNaN(regularity) ? 0 : roundTo2(regularity);
}
