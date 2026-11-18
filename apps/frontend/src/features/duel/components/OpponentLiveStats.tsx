import { useDuelParticipants } from "../hooks/useDuelParticipants.ts";
import { useOpponentLiveWpm } from "../hooks/useOpponentLiveWpm.ts";

export function OpponentLiveStats() {
  const { opponent } = useDuelParticipants();
  const wpm = useOpponentLiveWpm();

  return (
    <p className="mb-2 flex gap-6 font-mono">
      <span className="text-opponent">{opponent?.name}</span> <span>{wpm} wpm</span>
    </p>
  );
}
