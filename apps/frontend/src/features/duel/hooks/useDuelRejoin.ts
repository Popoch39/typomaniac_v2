import { useDuelStore } from "../store/useDuelStore.ts";

/**
 * Reopens the Duel link, as opening it again by hand would: that is how a Participant gets their seat
 * back, with their Game where they left it.
 */
export function useDuelRejoin() {
  const duelId = useDuelStore((state) => state.duelId);
  const join = useDuelStore((state) => state.join);
  return () => {
    if (duelId !== null) join(duelId);
  };
}
