import { create } from "zustand";
import { searchTermOf } from "../search/searchTermOf.ts";

type FriendSearchState = {
  /** What the Player typed in the search, as they typed it. */
  readonly typed: string;
  /** The Nickname start searched for, once the Player paused typing; null while nothing may be. */
  readonly term: string | null;
  readonly type: (typed: string) => void;
};

// A search per keystroke would spend the Player's read limit: one is sent once they pause.
const SEARCH_DEBOUNCE_MS = 300;

// Owned by the store because components may not run effects.
let searchTimer: ReturnType<typeof setTimeout> | null = null;

export const useFriendSearchStore = create<FriendSearchState>()((set) => ({
  typed: "",
  term: null,
  type: (typed) => {
    set({ typed });
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTimer = null;
      set({ term: searchTermOf(typed) });
    }, SEARCH_DEBOUNCE_MS);
  },
}));
