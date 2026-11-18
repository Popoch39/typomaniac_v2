import { useDuelPhase } from "../hooks/useDuelPhase.ts";
import { DuelInviteLink } from "./DuelInviteLink.tsx";
import { DuelParticipants } from "./DuelParticipants.tsx";
import { DuelRefusal } from "./DuelRefusal.tsx";

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
    </main>
  );
}
