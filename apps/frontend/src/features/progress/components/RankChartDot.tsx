import type { RankChange } from "@repo/ranked-engine";

// The marker's half size, so that a Promotion or a demotion stands out from the other Duels.
const MARK = 7;

/**
 * A ranked Duel on the Rank curve: a Promotion is a triangle pointing up in the action colour, a
 * demotion one pointing down in danger, any other Duel a dot.
 */
interface RankChartDotProps {
  cx?: number;
  cy?: number;
  payload?: { rankChange?: RankChange };
}

export function RankChartDot({ cx, cy, payload }: RankChartDotProps) {
  if (cx === undefined || cy === undefined) return null;
  if (payload?.rankChange === "promoted") {
    return (
      <path
        d={`M${cx} ${cy - MARK}L${cx + MARK} ${cy + MARK - 1}H${cx - MARK}Z`}
        className="fill-action stroke-surface-card"
        strokeWidth={2}
      />
    );
  }
  if (payload?.rankChange === "demoted") {
    return (
      <path
        d={`M${cx} ${cy + MARK}L${cx + MARK} ${cy - MARK + 1}H${cx - MARK}Z`}
        className="fill-danger stroke-surface-card"
        strokeWidth={2}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={3} className="fill-ink" />;
}
