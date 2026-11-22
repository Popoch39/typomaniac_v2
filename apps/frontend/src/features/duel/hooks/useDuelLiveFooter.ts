import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { useGameStore } from "../../game/store/useGameStore.ts";
import { bothWpmHistories } from "../chart/bothWpmHistories.ts";
import { drawnCurves } from "../chart/drawnCurves.ts";
import { wpmChart } from "../chart/wpmChart.ts";
import { wpmChartLabel } from "../chart/wpmChartLabel.ts";
import { roundOf } from "../phase/duelPhase.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useDuelLivePoints } from "./useDuelLivePoints.ts";

// The sparkline's plot: 308px for the whole Round, 20px of WPM between its margins.
const SPARKLINE_BOX = { width: 308, height: 20, seconds: DUEL_GAME_CONFIG.seconds };

/** Both Participants' live WPM and Accuracy, the Participant's own first, and the WPM sparkline. */
export function useDuelLiveFooter() {
  const game = useGameStore((state) => state.game);
  const readAt = useGameStore((state) => state.readAt);
  const opponentGame = useDuelStore((state) => state.opponentGame);
  const round = useDuelStore((state) => roundOf(state.lifecycle));
  const live = useDuelLivePoints();
  const self = { ...live.self, name: live.self.name ?? "" };
  const opponent = { ...live.opponent, name: live.opponent.name ?? "" };
  const { histories, heads } = bothWpmHistories(game, opponentGame, readAt);
  const chart = wpmChart(histories, SPARKLINE_BOX, heads);
  return {
    self,
    opponent,
    sparkline: { label: wpmChartLabel(round ?? 1, [self, opponent]), curves: drawnCurves(chart) },
  };
}
