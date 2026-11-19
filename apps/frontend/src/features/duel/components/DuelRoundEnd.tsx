import type { Outcome } from "@repo/duel-engine";
import { cn } from "../../../shared/lib/utils.ts";
import { useDuelRounds } from "../hooks/useDuelRounds.ts";
import { DuelCaption } from "./DuelCaption.tsx";
import { DuelNextRound } from "./DuelNextRound.tsx";
import { DuelRoundOutcomeIcon } from "./DuelRoundOutcomeIcon.tsx";
import { DuelRoundDetails } from "./DuelRoundDetails.tsx";

// The caption names the winner by name only, so its icon and colour tell the Participant at a
// glance whether the Round is theirs.
const TONES: Readonly<Record<Outcome, string>> = {
  win: "text-action",
  loss: "text-danger",
  draw: "text-ink-subtle",
};

export function DuelRoundEnd() {
  const ended = useDuelRounds().at(-1);
  if (ended === undefined) return null;

  return (
    <>
      {/* The central block fills what the details band leaves, so the band stays at the bottom. */}
      <section className="flex grow flex-col items-center justify-center gap-[22px] text-center">
        <DuelCaption className={cn("flex items-center gap-2.5", TONES[ended.outcome])}>
          <DuelRoundOutcomeIcon outcome={ended.outcome} />
          {ended.caption}
        </DuelCaption>
        <DuelNextRound />
      </section>
      <DuelRoundDetails />
    </>
  );
}
