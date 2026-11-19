import { TypingArea } from "../../game/components/TypingArea.tsx";
import { DuelLiveFooter } from "./DuelLiveFooter.tsx";

export function DuelLiveRound() {
  return (
    <>
      {/* The words fill what the band and the footer leave and sit in its middle. The footer and the
          band already show the Live stats, so the Game's own bar is left out. */}
      <section aria-label="Target words" className="flex grow flex-col justify-center px-6">
        <TypingArea wordSize="large" hasLiveStats={false} />
      </section>
      <DuelLiveFooter />
    </>
  );
}
