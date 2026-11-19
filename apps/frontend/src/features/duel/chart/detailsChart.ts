import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { type DrawnCurve, drawnCurves } from "./drawnCurves.ts";
import { wpmChart } from "./wpmChart.ts";
import { wpmChartLabel } from "./wpmChartLabel.ts";
import { type WpmGridline, wpmGridlines } from "./wpmGridlines.ts";

// The plot inside the chart's 520 × 120 box: room on the left for the WPM labels, under it for the
// time labels, and above and below the curves for their markers.
const PLOT = { left: 36, top: 8, width: 472, height: 90 } as const;
const TIME_LABEL_EVERY_SECONDS = 10;
// The time labels' baseline, under the plot.
const TIME_LABEL_OFFSET = 18;

type ChartSide = {
  readonly name: string;
  /** The WPM of the Round's Result. */
  readonly wpm: number;
  readonly history: readonly number[];
};

export type DetailsChart = {
  readonly plot: typeof PLOT;
  readonly label: string;
  /** Measured from the top of the plot. */
  readonly gridlines: readonly WpmGridline[];
  /** Measured from the left of the plot. */
  readonly times: readonly { readonly second: number; readonly x: number }[];
  readonly timeLabelY: number;
  /** Measured from the top-left corner of the plot. */
  readonly curves: readonly DrawnCurve[];
};

/**
 * The WPM chart of the details band of Round `round`, from both sides, the Participant's own
 * first: both curves over the whole Round, labelled WPM gridlines and a time axis every 10 seconds.
 */
export function detailsChart(
  round: number,
  [own, opponent]: readonly [ChartSide, ChartSide],
): DetailsChart {
  const { seconds } = DUEL_GAME_CONFIG;
  const chart = wpmChart([own.history, opponent.history], {
    width: PLOT.width,
    height: PLOT.height,
    seconds,
  });
  return {
    plot: PLOT,
    label: wpmChartLabel(round, [own, opponent]),
    gridlines: wpmGridlines(chart.scale, PLOT.height),
    times: Array.from({ length: seconds / TIME_LABEL_EVERY_SECONDS + 1 }, (_, index) => {
      const second = index * TIME_LABEL_EVERY_SECONDS;
      return { second, x: (second * PLOT.width) / seconds };
    }),
    timeLabelY: PLOT.top + PLOT.height + TIME_LABEL_OFFSET,
    curves: drawnCurves(chart),
  };
}
