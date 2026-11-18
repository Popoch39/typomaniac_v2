import { useDuelParticipants } from "../hooks/useDuelParticipants.ts";

export function DuelParticipants() {
  const { self, opponent, opponentAway } = useDuelParticipants();

  return (
    <p className="duel-participants">
      <span>{self?.name}</span> vs{" "}
      {opponent ? <span>{opponent.name}</span> : <span>waiting for an Opponent…</span>}
      {opponentAway && (
        <span className="opponent-away" role="status">
          {" "}
          (disconnected)
        </span>
      )}
    </p>
  );
}
