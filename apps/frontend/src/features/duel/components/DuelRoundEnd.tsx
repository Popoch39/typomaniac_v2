import { useDuelRounds } from "../hooks/useDuelRounds.ts";
import { DuelCaption } from "./DuelCaption.tsx";
import { DuelNextRound } from "./DuelNextRound.tsx";
import { DuelRoundDetails } from "./DuelRoundDetails.tsx";

export function DuelRoundEnd() {
  const ended = useDuelRounds().at(-1);
  if (ended === undefined) return null;

  return (
    <>
      {/* The central block fills what the details band leaves, so the band stays at the bottom. */}
      <section className="flex grow flex-col items-center justify-center gap-[22px] text-center">
        <DuelCaption>{ended.caption}</DuelCaption>
        <DuelNextRound />
      </section>
      <DuelRoundDetails />
    </>
  );
}
