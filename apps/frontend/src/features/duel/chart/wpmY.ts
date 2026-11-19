export type WpmScale = {
  /** The WPM at the bottom of the chart. */
  readonly min: number;
  /** The WPM at the top of the chart. */
  readonly max: number;
};

/** How far down a chart `height` pixels tall drawn on `scale` a WPM sits. */
export function wpmY(wpm: number, { min, max }: WpmScale, height: number) {
  // A flat scale has no height to spread over: everything runs through the middle.
  return max === min ? height / 2 : height - ((wpm - min) / (max - min)) * height;
}
