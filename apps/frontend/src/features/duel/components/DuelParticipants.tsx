import { useDuelParticipants } from "../hooks/useDuelParticipants.ts";

export function DuelParticipants() {
  const { self, opponent, opponentAway, opponentRank } = useDuelParticipants();

  return (
    // Each name in the colour of its caret, the Participant's own first.
    <p className="text-xl text-muted-foreground">
      <span className="font-medium text-primary">{self?.name}</span> vs{" "}
      {opponent ? (
        <span className="font-medium text-opponent">{opponent.name}</span>
      ) : (
        <span>waiting for an Opponent…</span>
      )}
      {opponent && opponentRank !== null && <span> ({opponentRank})</span>}
      {opponentAway && (
        <span className="opacity-60" role="status">
          {" "}
          (disconnected)
        </span>
      )}
    </p>
  );
}
