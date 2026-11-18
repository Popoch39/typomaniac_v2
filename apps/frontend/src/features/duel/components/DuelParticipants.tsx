import { useDuelParticipants } from "../hooks/useDuelParticipants.ts";

export function DuelParticipants() {
  const { self, opponent, opponentAway } = useDuelParticipants();

  return (
    <p>
      <span>{self?.name}</span> vs{" "}
      {opponent ? <span>{opponent.name}</span> : <span>waiting for an Opponent…</span>}
      {opponentAway && (
        <span className="opacity-60" role="status">
          {" "}
          (disconnected)
        </span>
      )}
    </p>
  );
}
