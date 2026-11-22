import { useDuelPhase } from "../hooks/useDuelPhase.ts";
import { DuelBroadcast } from "./DuelBroadcast.tsx";
import { DuelConnecting } from "./DuelConnecting.tsx";
import { DuelDisconnected } from "./DuelDisconnected.tsx";
import { DuelReconnecting } from "./DuelReconnecting.tsx";
import { DuelRefusalPanel } from "./DuelRefusalPanel.tsx";
import { DuelWaiting } from "./DuelWaiting.tsx";

export function DuelScreen() {
  const { phase, broadcast } = useDuelPhase();

  if (broadcast !== null) {
    return (
      <>
        <DuelBroadcast phase={broadcast} />
        <DuelReconnecting />
      </>
    );
  }

  return (
    // Full screen outside the shell: a centred column with room around it, like the Game screen's padding.
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-8 py-16 text-left">
      {phase.kind === "connecting" && <DuelConnecting />}
      {phase.kind === "refused" && <DuelRefusalPanel message={phase.refusal} />}
      {phase.kind === "waiting" && <DuelWaiting />}
      {phase.kind === "disconnected" && <DuelDisconnected closeReason={phase.closeReason} />}
      <DuelReconnecting />
    </main>
  );
}
