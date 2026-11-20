import { Keycap } from "../../../shared/components/Keycap.tsx";
import { cn } from "../../../shared/lib/utils.ts";
import { useReportOpponent } from "../hooks/useReportOpponent.ts";
import { REPORT_LABELS } from "../report/reportAction.ts";

export function DuelReportOpponent() {
  const { label, failure, disabled, report } = useReportOpponent();

  return (
    <div className="relative">
      <Keycap type="button" variant="neutral" size="lg" onClick={report} disabled={disabled}>
        {/* Every label stacked in one cell, the hidden ones keeping the key at the longest's size. */}
        <span aria-live="polite" className="grid">
          {REPORT_LABELS.map((each) => (
            <span
              key={each}
              className={cn("col-start-1 row-start-1", each !== label && "invisible")}
            >
              {each}
            </span>
          ))}
        </span>
      </Keycap>
      {/* Under the key, out of the flow, so that a failure moves nothing on the Duel end. */}
      <p
        role="alert"
        className="absolute top-full left-1/2 m-0 mt-2 -translate-x-1/2 whitespace-nowrap text-danger"
      >
        {failure}
      </p>
    </div>
  );
}
