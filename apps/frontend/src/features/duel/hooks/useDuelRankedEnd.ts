import { describeRankedEnd } from "../../ranked/standing/describeRankedEnd.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

/** What a ranked Duel did to the Participant's own Standing, in words; `null` for a Custom Duel. */
export function useDuelRankedEnd() {
  const end = useDuelStore((state) => state.end);
  const seat = useDuelStore((state) => state.seat);
  if (end === null || end.ranked === null || seat === null) return null;
  return describeRankedEnd(end.ranked[seat]);
}
