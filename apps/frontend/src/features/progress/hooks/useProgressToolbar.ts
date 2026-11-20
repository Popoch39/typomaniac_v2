import { PROGRESS_KINDS, PROGRESS_WINDOWS } from "../filter/progressFilter.ts";
import { useProgressFilterStore } from "../store/useProgressFilterStore.ts";

/** The periods and kinds of Duels to choose from, and the ones chosen. */
export function useProgressToolbar() {
  const filter = useProgressFilterStore((s) => s.filter);
  const chooseWindow = useProgressFilterStore((s) => s.chooseWindow);
  const chooseKind = useProgressFilterStore((s) => s.chooseKind);
  return {
    windows: PROGRESS_WINDOWS,
    kinds: PROGRESS_KINDS,
    window: filter.window,
    kind: filter.kind,
    chooseWindow,
    chooseKind,
  };
}
