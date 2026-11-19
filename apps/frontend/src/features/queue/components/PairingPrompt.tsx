import { Keycap } from "../../../shared/components/Keycap.tsx";
import { usePairingPrompt } from "../hooks/usePairingPrompt.ts";
import { AcceptCountdown } from "./AcceptCountdown.tsx";
import { PairingSides } from "./PairingSides.tsx";
import { QueueStatusLine } from "./QueueStatusLine.tsx";

export function PairingPrompt() {
  const { players, timeLeft, drainedShare, isAccepted, accept } = usePairingPrompt();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="m-0 type-card-title text-action">Opponent found</p>
      {players && <PairingSides players={players} />}
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
              className="w-full text-2xl"
            >
              Accept
            </Keycap>
          </div>
        </div>
      )}
    </div>
  );
}
