import { useDuelPhase } from "../hooks/useDuelPhase.ts";
import { DuelBroadcast } from "./DuelBroadcast.tsx";
import { DuelDisconnected } from "./DuelDisconnected.tsx";
import { DuelInviteLink } from "./DuelInviteLink.tsx";
import { DuelParticipants } from "./DuelParticipants.tsx";
import { DuelRefusal } from "./DuelRefusal.tsx";

export function DuelScreen() {
  const phase = useDuelPhase();

  if (
    phase === "countdown" ||
    phase === "running" ||
    phase === "roundEnd" ||
    phase === "finished"
  ) {
    return <DuelBroadcast phase={phase} />;
  }

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
      {phase === "disconnected" && <DuelDisconnected />}
    </main>
  );
}
