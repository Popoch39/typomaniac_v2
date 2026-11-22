import { rankedEndBlock } from "../rank/rankedEndBlock.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useTierPromotionStore } from "../store/useTierPromotionStore.ts";

/**
 * What a ranked Duel did to the Participant's own Standing: `isRanked` is known from the start of
 * the Duel, so its place is kept before the server ends it; `block` is `null` until then. The LP
 * bar sweeps once no Rank up scene covers it.
 */
export function useDuelRankedEnd() {
  const isRanked = useDuelStore((state) => state.ranks !== null);
  const end = useDuelStore((state) =>
    state.lifecycle.kind === "finished" ? state.lifecycle.end : null,
  );
  const seat = useDuelStore((state) => state.seat);
  const isLpSweepHeld = useTierPromotionStore((state) => state.isLpSweepHeld);
  const ranked = end?.ranked ?? null;
  return {
    isRanked,
    block: ranked === null || seat === null ? null : rankedEndBlock(ranked[seat]),
    isLpSweepHeld,
  };
}
