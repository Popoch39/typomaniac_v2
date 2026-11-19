import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { asPolyline } from "../chart/asPolyline.ts";
import { wpmChart } from "../chart/wpmChart.ts";
import { wpmGridlines } from "../chart/wpmGridlines.ts";
import { roundPips } from "../round/roundPips.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useDuelRounds } from "./useDuelRounds.ts";

// The chart's plot inside its 520 × 120 box: room on the left for the WPM labels, under it for the
// time labels, and above and below the curves for their markers.
const DETAILS_CHART_PLOT = { left: 36, top: 8, width: 472, height: 90 } as const;
const TIME_LABEL_EVERY_SECONDS = 10;

/**
 * The details of the last finished Round, the Participant's own side first: both WPM curves with
 * their axes, the WPM / Accuracy / Consistency table and every finished Round with both Points.
 */
export function useDuelRoundDetails() {
  const seat = useDuelStore((state) => state.seat);
  const rounds = useDuelStore((state) => state.rounds);
  const summaries = useDuelRounds();
  const last = summaries.at(-1);
  if (seat === null || last === undefined) return null;
  const [own, opponent] = last.sides;
  if (own === undefined || opponent === undefined) return null;

  const { seconds } = DUEL_GAME_CONFIG;
  const chart = wpmChart([own.result.history.wpm, opponent.result.history.wpm], {
    width: DETAILS_CHART_PLOT.width,
    height: DETAILS_CHART_PLOT.height,
    seconds,
  });
  const [ownCurve, opponentCurve] = chart.curves;
  const names = { self: own.name, opponent: opponent.name };
  const pips = roundPips(rounds, null, seat, names);
  const percent = (value: number) => `${Math.round(value)}%`;

  return {
    number: last.number,
    chart: {
      plot: DETAILS_CHART_PLOT,
      label: `WPM over Round ${last.number}: ${own.name} ${Math.round(own.result.wpm)}, ${opponent.name} ${Math.round(opponent.result.wpm)}`,
      gridlines: wpmGridlines(chart.scale, DETAILS_CHART_PLOT.height),
      times: Array.from(
        { length: seconds / TIME_LABEL_EVERY_SECONDS + 1 },
        (_, index) => index * TIME_LABEL_EVERY_SECONDS,
      ).map((second) => ({ second, x: (second * DETAILS_CHART_PLOT.width) / seconds })),
      // The Opponent's curve first, so that the Participant's own is drawn on top of it.
      curves: [
        {
          ...opponentCurve,
          polyline: asPolyline(opponentCurve.points),
          className: "text-opponent",
        },
        { ...ownCurve, polyline: asPolyline(ownCurve.points), className: "text-action" },
      ],
    },
    table: {
      names,
      rows: [
        {
          label: "WPM",
          values: [own, opponent].map(({ result }) => String(Math.round(result.wpm))),
        },
        {
          label: "Accuracy",
          values: [own, opponent].map(({ result }) => percent(result.accuracy)),
        },
        {
          label: "Consistency",
          values: [own, opponent].map(({ result }) => percent(result.consistency)),
        },
      ],
    },
    rounds: summaries.map(({ number, sides }) => ({
      number,
      state: pips[number - 1]?.state ?? "upcoming",
      label: pips[number - 1]?.label ?? "",
      points: sides.map((side) => side.points).join(" – "),
    })),
  };
}
