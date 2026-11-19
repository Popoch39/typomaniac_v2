import { useDuelRounds } from "../hooks/useDuelRounds.ts";
import { DuelNextRound } from "./DuelNextRound.tsx";
import { DuelRoundDetails } from "./DuelRoundDetails.tsx";

export function DuelRoundEnd() {
  const ended = useDuelRounds().at(-1);
  if (ended === undefined) return null;

  return (
    <>
      {/* The central block fills what the details band leaves, so the band stays at the bottom. */}
      <section className="flex grow flex-col items-center justify-center gap-[22px] text-center">
        <h2 className="m-0 font-mono text-xs font-bold tracking-[.16em] text-ink-subtle uppercase">
          {ended.caption}
        </h2>
        <DuelNextRound />
      </section>
      <DuelRoundDetails />
    </>
  );
}
