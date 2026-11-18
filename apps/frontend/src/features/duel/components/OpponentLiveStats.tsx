import { useDuelParticipants } from "../hooks/useDuelParticipants.ts";
import { useOpponentLiveWpm } from "../hooks/useOpponentLiveWpm.ts";

export function OpponentLiveStats() {
  const { opponent } = useDuelParticipants();
  const wpm = useOpponentLiveWpm();

  return (
    <p className="opponent-live-stats">
      <span className="opponent-name">{opponent?.name}</span> <span>{wpm} wpm</span>
    </p>
  );
}
