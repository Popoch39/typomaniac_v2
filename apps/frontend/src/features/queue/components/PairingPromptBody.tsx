import { Keycap } from "../../../shared/components/Keycap.tsx";
import { usePairingPrompt } from "../hooks/usePairingPrompt.ts";
import { AcceptCountdown } from "./AcceptCountdown.tsx";
import { PairingSides } from "./PairingSides.tsx";
import { QueueStatusLine } from "./QueueStatusLine.tsx";

/** Both sides of the Pairing, then its countdown and Accept key, or the wait for the Opponent. */
export function PairingPromptBody() {
  const prompt = usePairingPrompt();

  if (prompt === null) return null;
  const { players, timeLeft, drainedShare, isAccepted, canAccept, accept } = prompt;

  return (
    <>
      <PairingSides players={players} />
      {isAccepted ? (
        <QueueStatusLine message="Accepted. Waiting for your Opponent…" />
      ) : (
        <div className="flex flex-col gap-4">
          <p role="status" className="sr-only">
            A Duel was found. Accept it to play.
          </p>
          <AcceptCountdown timeLeft={timeLeft} drainedShare={drainedShare} />
          <div className="pb-2">
            <Keycap
              type="button"
              variant="action"
              size="lg"
              onClick={accept}
              disabled={!canAccept}
              className="w-full text-2xl"
            >
              Accept
            </Keycap>
          </div>
        </div>
      )}
    </>
  );
}
