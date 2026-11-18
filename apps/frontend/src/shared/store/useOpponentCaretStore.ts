import { create } from "zustand";

/** Where the Opponent's caret sits in the Participant's own text, with the Opponent's name. */
export type OpponentCaret = {
  readonly wordIndex: number;
  readonly letterIndex: number;
  readonly name: string;
};

type OpponentCaretState = {
  /** `null` outside a Duel, or before the Opponent has arrived. */
  readonly caret: OpponentCaret | null;
  readonly show: (caret: OpponentCaret | null) => void;
};

export const useOpponentCaretStore = create<OpponentCaretState>()((set) => ({
  caret: null,
  show: (caret) => set({ caret }),
}));
