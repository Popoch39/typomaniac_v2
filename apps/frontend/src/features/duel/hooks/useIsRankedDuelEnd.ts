import { useDuelStore } from "../store/useDuelStore.ts";

/** Whether the Duel that ended is a ranked one, whose end leads back to the Ranked page. */
export function useIsRankedDuelEnd() {
  return useDuelStore((state) => state.end?.ranked != null);
}
