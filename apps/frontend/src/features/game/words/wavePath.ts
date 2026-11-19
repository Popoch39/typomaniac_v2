// How far the wave stops short of each end of the word, in letters, so its round caps stay under the word.
const WAVE_INSET = 0.12;

/**
 * The logo's wave under a Wrong word of `letters` letters, on a viewBox `letters` wide and 1 high:
 * one crest and one trough per letter, so the wave keeps the same rhythm on every word and ends on its width.
 */
export function wavePath(letters: number) {
  const halves = Math.max(2, 2 * letters);
  const half = (letters - 2 * WAVE_INSET) / halves;
  const at = (step: number) => (WAVE_INSET + step * half).toFixed(3);

  // The first half's control point, above the viewBox, bends it up to the top edge; each T mirrors it for the next half.
  const smooth = Array.from({ length: halves - 1 }, (_, step) => `T${at(step + 2)} 0.5`);

  return [`M${WAVE_INSET} 0.5 Q${at(0.5)} -0.5 ${at(1)} 0.5`, ...smooth].join(" ");
}
