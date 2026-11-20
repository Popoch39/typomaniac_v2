import { create } from "zustand";
import {
  DEFAULT_PROGRESS_FILTER,
  type ProgressFilter,
  type ProgressKind,
  type ProgressWindow,
} from "../filter/progressFilter.ts";

type ProgressFilterState = {
  /** The period and the kind of Duels every chart of the Progress follows. */
  readonly filter: ProgressFilter;
  readonly chooseWindow: (window: ProgressWindow) => void;
  readonly chooseKind: (kind: ProgressKind) => void;
};

export const useProgressFilterStore = create<ProgressFilterState>()((set) => ({
  filter: DEFAULT_PROGRESS_FILTER,
  chooseWindow: (window) => set(({ filter }) => ({ filter: { ...filter, window } })),
  chooseKind: (kind) => set(({ filter }) => ({ filter: { ...filter, kind } })),
}));
