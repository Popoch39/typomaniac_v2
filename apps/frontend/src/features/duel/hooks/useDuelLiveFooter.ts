import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { useGameStore } from "../../game/store/useGameStore.ts";
import { bothWpmHistories } from "../chart/bothWpmHistories.ts";
import { type ChartPoint, wpmChart } from "../chart/wpmChart.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useDuelLivePoints } from "./useDuelLivePoints.ts";

// The sparkline's plot: 308px for the whole Round, 20px of WPM between its margins.
const SPARKLINE_BOX = { width: 308, height: 20, seconds: DUEL_GAME_CONFIG.seconds };

const asPolyline = (points: readonly ChartPoint[]) =>
  points.map(({ x, y }) => `${x},${y}`).join(" ");

/** Both Participants' live WPM and Accuracy, the Participant's own first, and the WPM sparkline. */
export function useDuelLiveFooter() {
  const game = useGameStore((state) => state.game);
  const readAt = useGameStore((state) => state.readAt);
  const opponentGame = useDuelStore((state) => state.opponentGame);
  const round = useDuelStore((state) => state.round);
  const live = useDuelLivePoints();
  const self = { ...live.self, name: live.self.name ?? "" };
  const opponent = { ...live.opponent, name: live.opponent.name ?? "" };
  const [ownCurve, opponentCurve] = wpmChart(
    bothWpmHistories(game, opponentGame, readAt),
    SPARKLINE_BOX,
  ).curves;
  return {
    self,
    opponent,
    sparkline: {
      label: `WPM over Round ${round ?? 1}: ${self.name} ${self.wpm}, ${opponent.name} ${opponent.wpm}`,
      curves: [
        {
          ...opponentCurve,
          polyline: asPolyline(opponentCurve.points),
          className: "text-opponent",
        },
        { ...ownCurve, polyline: asPolyline(ownCurve.points), className: "text-action" },
      ],
    },
  };
}
