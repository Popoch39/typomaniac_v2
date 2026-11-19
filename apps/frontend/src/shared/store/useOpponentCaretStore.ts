import { create } from "zustand";

/** Who the Opponent is, as their caret shows them: their Avatar, or their name's initial without one. */
export type CaretOpponent = {
  readonly name: string;
  readonly avatarUrl: string | null;
};

/** Where the Opponent's caret sits in the Participant's own text, with the Opponent. */
export type OpponentCaret = {
  readonly wordIndex: number;
  readonly letterIndex: number;
  readonly opponent: CaretOpponent;
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
