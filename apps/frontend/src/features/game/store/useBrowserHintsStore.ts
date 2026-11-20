import type { BrowserHints } from "@repo/duel-engine";
import { create } from "zustand";

type BrowserHintsState = {
  /** The keys of the current Game the browser did not flag as trusted: a script generated them. */
  readonly scriptedKeys: number;
  /** Whether the hints of the current Game were handed already. */
  readonly isTaken: boolean;
  /** Counts a key of the Game by the browser's own trusted flag, which a page script cannot set. */
  readonly countKey: (isTrusted: boolean) => void;
  /**
   * The hints of the current Game, with whether the browser says it is automated; handed once,
   * `null` after that until the next Game.
   */
  readonly take: (automated: boolean) => BrowserHints | null;
  /** Starts counting a new Game. */
  readonly reset: () => void;
};

export const useBrowserHintsStore = create<BrowserHintsState>()((set, get) => ({
  scriptedKeys: 0,
  isTaken: false,
  countKey: (isTrusted) => {
    if (!isTrusted) set((state) => ({ scriptedKeys: state.scriptedKeys + 1 }));
  },
  take: (automated) => {
    const { scriptedKeys, isTaken } = get();
    if (isTaken) return null;
    set({ isTaken: true });
    return { scriptedKeys, automated };
  },
  reset: () => set({ scriptedKeys: 0, isTaken: false }),
}));
