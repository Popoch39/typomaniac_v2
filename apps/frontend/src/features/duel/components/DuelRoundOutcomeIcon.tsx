import type { Outcome } from "@repo/duel-engine";
import { StrokeIcon } from "../../../shared/components/StrokeIcon.tsx";

interface DuelRoundOutcomeIconProps {
  outcome: Outcome;
}

/** A check for a won Round, a cross for a lost one and a dash for a draw. */
export function DuelRoundOutcomeIcon({ outcome }: DuelRoundOutcomeIconProps) {
  return (
    <StrokeIcon heavy>
      {outcome === "win" && <path d="M5 12.5l4.5 4.5L19 7" />}
      {outcome === "loss" && (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      )}
      {outcome === "draw" && <path d="M6 12h12" />}
    </StrokeIcon>
  );
}
