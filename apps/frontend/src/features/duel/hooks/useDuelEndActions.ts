import { useDuelStore } from "../store/useDuelStore.ts";

/**
 * Which actions follow the Duel: those of a ranked or of a Custom Duel, known from its start, so
 * that they keep their place after the last Round; they can be pressed once the server ended it.
 */
export function useDuelEndActions() {
  const isRanked = useDuelStore((state) => state.ranks !== null);
  const isEnded = useDuelStore((state) => state.phase === "finished");
  return { isRanked, isEnded };
}
