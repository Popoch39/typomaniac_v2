/** A Multiplier as it is shown, always with two decimals so that its width never changes: ×1.07. */
export function formatMultiplier(multiplier: number) {
  return `×${multiplier.toFixed(2)}`;
}
