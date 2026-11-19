import { detailsChart } from "../chart/detailsChart.ts";
import { roundList } from "../round/roundList.ts";
import { roundPips } from "../round/roundPips.ts";
import { roundTable } from "../round/roundTable.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useDuelRounds } from "./useDuelRounds.ts";

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
  const names = { self: own.name, opponent: opponent.name };
  const { pips } = roundPips(rounds, null, seat, names);
  return {
    number: last.number,
    chart: detailsChart(last.number, [
      { name: own.name, wpm: own.result.wpm, history: own.result.history.wpm },
      { name: opponent.name, wpm: opponent.result.wpm, history: opponent.result.history.wpm },
    ]),
    names,
    rows: roundTable(own.result, opponent.result),
    rounds: roundList(summaries, pips),
  };
}
