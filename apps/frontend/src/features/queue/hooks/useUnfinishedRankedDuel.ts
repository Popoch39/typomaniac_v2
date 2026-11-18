import { useQuery } from "@tanstack/react-query";
import { queueQueryOptions } from "../api/queueQueryOptions.ts";
import { unfinishedRankedDuelOf } from "../refusal/unfinishedRankedDuelOf.ts";

/** The ranked Duel the Player must finish before entering the Queue, `null` when there is none. */
export function useUnfinishedRankedDuel() {
  // A refusal is no failure to try again: the Duel to go back to is shown at once.
  const { error } = useQuery({ ...queueQueryOptions(), retry: false });
  return unfinishedRankedDuelOf(error);
}
