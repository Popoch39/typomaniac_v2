import { useDuelRoundDetails } from "../hooks/useDuelRoundDetails.ts";
import { DuelRoundChart } from "./DuelRoundChart.tsx";
import { DuelRoundList } from "./DuelRoundList.tsx";
import { DuelRoundTable } from "./DuelRoundTable.tsx";

/** The band of details of the last finished Round, under the end of a Round and of the Duel. */
export function DuelRoundDetails() {
  const details = useDuelRoundDetails();
  if (details === null) return null;

  return (
    <section
      aria-label={`Round ${details.number} details`}
      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-14 border-t-2 border-key-face pt-[22px]"
    >
      <DuelRoundChart number={details.number} chart={details.chart} />
      <DuelRoundTable number={details.number} names={details.names} rows={details.rows} />
      <DuelRoundList rounds={details.rounds} />
    </section>
  );
}
