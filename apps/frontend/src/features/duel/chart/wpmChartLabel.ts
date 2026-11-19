type LabelSide = {
  readonly name: string;
  readonly wpm: number;
};

/** What a screen reader says of a WPM chart of a Round: both WPMs, the Participant's own first. */
export function wpmChartLabel(round: number, [own, opponent]: readonly [LabelSide, LabelSide]) {
  return `WPM over Round ${round}: ${own.name} ${Math.round(own.wpm)}, ${opponent.name} ${Math.round(opponent.wpm)}`;
}
