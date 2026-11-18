import { useGameStore } from "../../game/store/useGameStore.ts";
import { livePoints } from "../points/livePoints.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useDuelParticipants } from "./useDuelParticipants.ts";

/** Both Participants' live Points, WPM and Accuracy, with their names, the Participant's own first. */
export function useDuelLivePoints() {
  const game = useGameStore((state) => state.game);
  const readAt = useGameStore((state) => state.readAt);
  const opponentGame = useDuelStore((state) => state.opponentGame);
  const { self, opponent } = useDuelParticipants();
  const sides = livePoints(game, opponentGame, readAt);
  return {
    own: { ...sides.own, name: self?.name },
    opponent: { ...sides.opponent, name: opponent?.name },
  };
}
