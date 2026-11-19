import { useDuelBroadcastBody } from "../hooks/useDuelBroadcastBody.ts";
import type { BroadcastPhase } from "../phase/duelPhase.ts";
import { DuelBand } from "./DuelBand.tsx";
import { DuelCountdown } from "./DuelCountdown.tsx";
import { DuelEnd } from "./DuelEnd.tsx";
import { DuelLiveRound } from "./DuelLiveRound.tsx";
import { DuelRoundEnd } from "./DuelRoundEnd.tsx";

interface DuelBroadcastProps {
  phase: BroadcastPhase;
}

export function DuelBroadcast({ phase }: DuelBroadcastProps) {
  const body = useDuelBroadcastBody(phase);

  return (
    // Full width up to 1440px, its margins narrowing on smaller screens, so the band and the Target
    // words have room.
    <main className="mx-auto flex min-h-svh w-full max-w-360 flex-col gap-6 px-[clamp(2rem,5vw,4.5rem)] pt-9 pb-10 text-left">
      <DuelBand />
      {/* The body fills what is left under the band, so a phase change never moves the band. */}
      <div className="flex grow flex-col gap-4">
        {body === "countdown" && <DuelCountdown />}
        {/* Mounted at the Start only: typing during the Countdown reaches no Game. */}
        {body === "live" && <DuelLiveRound />}
        {body === "roundEnd" && <DuelRoundEnd />}
        {body === "duelEnd" && <DuelEnd />}
      </div>
    </main>
  );
}
