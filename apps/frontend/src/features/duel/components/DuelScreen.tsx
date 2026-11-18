import "../../game/components/GameScreen.css";
import { TypingArea } from "../../game/components/TypingArea.tsx";
import { useDuelPhase } from "../hooks/useDuelPhase.ts";
import { DuelCountdown } from "./DuelCountdown.tsx";
import { DuelEnd } from "./DuelEnd.tsx";
import { DuelInviteLink } from "./DuelInviteLink.tsx";
import { DuelParticipants } from "./DuelParticipants.tsx";
import { DuelRefusal } from "./DuelRefusal.tsx";
import "./DuelScreen.css";
import { OpponentLiveStats } from "./OpponentLiveStats.tsx";

export function DuelScreen() {
  const phase = useDuelPhase();

  return (
    <main className="duel-screen">
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
          <DuelCountdown />
        </>
      )}
      {/* Mounted at the Start only: typing during the Countdown reaches no Game. */}
      {phase === "running" && (
        <>
          <DuelParticipants />
          <OpponentLiveStats />
          <TypingArea />
        </>
      )}
      {phase === "finished" && <DuelEnd />}
    </main>
  );
}
