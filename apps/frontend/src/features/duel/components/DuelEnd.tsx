import { useDuelRounds } from "../hooks/useDuelRounds.ts";
import { useDuelTitle } from "../hooks/useDuelTitle.ts";
import { DuelCaption } from "./DuelCaption.tsx";
import { DuelEndActions } from "./DuelEndActions.tsx";
import { DuelRankedEnd } from "./DuelRankedEnd.tsx";
import { DuelRoundDetails } from "./DuelRoundDetails.tsx";

/**
 * The end of the Duel, shown as soon as its last Round ends: the Rounds already decide its Outcome,
 * and what the server adds when it ends the Duel fills places kept for it.
 */
export function DuelEnd() {
  const title = useDuelTitle();
  const ended = useDuelRounds().at(-1);
  if (title === null || ended === undefined) return null;

  return (
    <>
      {/* The central block fills what the details band leaves, so the band stays at the bottom. */}
      <section className="flex grow flex-col items-center justify-center gap-[22px] text-center">
        <DuelCaption>{ended.caption}</DuelCaption>
        <h1 className="m-0 font-display text-[56px] leading-none font-normal text-ink">{title}</h1>
        <DuelRankedEnd />
        <DuelEndActions />
      </section>
      <DuelRoundDetails />
    </>
  );
}
