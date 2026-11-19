import { useDuelParticipants } from "../hooks/useDuelParticipants.ts";
import { DuelParticipantChip } from "./DuelParticipantChip.tsx";

export function DuelParticipants() {
  const { self, opponent, opponentAway, opponentRank } = useDuelParticipants();

  return (
    // The Participant's own side first.
    <div className="flex items-center gap-4 text-xl text-muted-foreground">
      {self && <DuelParticipantChip participant={self} isOwn />}
      <span>vs</span>
      {opponent ? (
        <DuelParticipantChip participant={opponent}>
          {opponentRank !== null && <span className="text-sm">{opponentRank}</span>}
          {opponentAway && (
            <span className="text-sm opacity-60" role="status">
              disconnected
            </span>
          )}
        </DuelParticipantChip>
      ) : (
        <span>waiting for an Opponent…</span>
      )}
    </div>
  );
}
