import { TypingArea } from "../../game/components/TypingArea.tsx";
import { useDuelPhase } from "../hooks/useDuelPhase.ts";
import { DuelCountdown } from "./DuelCountdown.tsx";
import { DuelDisconnected } from "./DuelDisconnected.tsx";
import { DuelEnd } from "./DuelEnd.tsx";
import { DuelInviteLink } from "./DuelInviteLink.tsx";
import { DuelLivePoints } from "./DuelLivePoints.tsx";
import { DuelParticipants } from "./DuelParticipants.tsx";
import { DuelRefusal } from "./DuelRefusal.tsx";
import { DuelRoundEnd } from "./DuelRoundEnd.tsx";
import { DuelRoundScore } from "./DuelRoundScore.tsx";

export function DuelScreen() {
  const phase = useDuelPhase();

  return (
    // Full screen outside the shell: a centred column with room around it, like the Game screen's padding.
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-8 py-16 text-left">
      {phase === "connecting" && <p>Joining the Duel…</p>}
      {phase === "refused" && <DuelRefusal />}
      {phase === "waiting" && (
        <>
          <DuelParticipants />
          <DuelInviteLink />
        </>
      )}
      {phase === "countdown" && (
        <>
          <DuelParticipants />
          <DuelRoundScore />
          <DuelCountdown />
        </>
      )}
      {/* Mounted at the Start only: typing during the Countdown reaches no Game. */}
      {phase === "running" && (
        <>
          <DuelParticipants />
          <DuelRoundScore />
          <DuelLivePoints />
          <TypingArea />
        </>
      )}
      {phase === "roundEnd" && (
        <>
          <DuelParticipants />
          <DuelRoundScore />
          <DuelRoundEnd />
        </>
      )}
      {phase === "finished" && <DuelEnd />}
      {phase === "disconnected" && <DuelDisconnected />}
    </main>
  );
}
