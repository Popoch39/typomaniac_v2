import type { RankedEnd } from "@repo/duel-engine";
import { create } from "zustand";
import { type TierPromotion, tierPromotion } from "../rank/tierPromotion.ts";

type TierPromotionState = {
  /** The Tier promotion the Rank up scene shows, while it is open. */
  readonly promotion: TierPromotion | null;
  /** The end screen's LP bar waits for the scene to close, so that its sweep is seen. */
  readonly isLpSweepHeld: boolean;
  /** Whether the scene of the current Duel was closed: it plays once per Duel. */
  readonly isDismissed: boolean;
  /** Opens the scene when the Participant's `RankedEnd` is a Tier promotion. */
  readonly end: (ranked: RankedEnd) => void;
  readonly dismiss: () => void;
  /** Forgets the scene of the Duel left, for the next one. */
  readonly reset: () => void;
};

const initialState = { promotion: null, isLpSweepHeld: false, isDismissed: false } as const;

export const useTierPromotionStore = create<TierPromotionState>()((set, get) => ({
  ...initialState,
  end: (ranked) => {
    if (get().isDismissed) return;
    const promotion = tierPromotion(ranked);
    set({ promotion, isLpSweepHeld: promotion !== null });
  },
  dismiss: () => set({ promotion: null, isLpSweepHeld: false, isDismissed: true }),
  reset: () => set(initialState),
}));
