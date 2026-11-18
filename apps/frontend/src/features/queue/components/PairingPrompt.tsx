import { Button } from "../../../shared/components/ui/button.tsx";
import { usePairingPrompt } from "../hooks/usePairingPrompt.ts";
import { PairingCountdown } from "./PairingCountdown.tsx";

// The Opponent stays hidden until the Duel: nothing here says who they are.
export function PairingPrompt() {
  const { secondsLeft, isAccepted, accept } = usePairingPrompt();

  return (
    <>
      <p role="status" className="text-base">
        {isAccepted
          ? "Accepted. Waiting for your Opponent…"
          : "A Duel was found. Accept it to play."}
      </p>
      <PairingCountdown secondsLeft={secondsLeft} />
      <Button type="button" onClick={accept} disabled={isAccepted}>
        {isAccepted ? "Waiting for your Opponent…" : "Accept the Duel"}
      </Button>
    </>
  );
}
