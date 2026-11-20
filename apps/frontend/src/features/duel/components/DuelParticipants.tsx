import type { Participant } from "@repo/duel-engine";
import { DuelParticipantChip } from "./DuelParticipantChip.tsx";

interface DuelParticipantsProps {
  self: Participant | undefined;
  opponent: Participant | undefined;
  opponentAway: boolean;
  /** The name of the Opponent's Rank in a ranked Duel. */
  opponentRank: string | null;
}

export function DuelParticipants({
  self,
  opponent,
  opponentAway,
  opponentRank,
}: DuelParticipantsProps) {
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
