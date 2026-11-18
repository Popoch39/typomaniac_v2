import type { GameConfig } from "@repo/typing-engine";
import type { MouseEvent } from "react";
import { useGameStore } from "../store/useGameStore.ts";

type Mode = GameConfig["mode"];

const MODES: readonly Mode[] = ["time", "words"];
const MODE_VALUES: Record<Mode, readonly number[]> = {
  time: [15, 30, 60, 120],
  words: [10, 25, 50, 100],
};
const DEFAULT_VALUES: Record<Mode, number> = { time: 30, words: 25 };

function configFor(mode: Mode, value: number): GameConfig {
  return mode === "time" ? { mode, seconds: value } : { mode, wordCount: value };
}

export function useConfigBar() {
  const config = useGameStore((state) => state.config);
  const setConfig = useGameStore((state) => state.setConfig);

  return {
    modes: MODES,
    mode: config.mode,
    values: MODE_VALUES[config.mode],
    value: config.mode === "time" ? config.seconds : config.wordCount,
    selectMode: (mode: Mode) => {
      if (mode !== config.mode) setConfig(configFor(mode, DEFAULT_VALUES[mode]));
    },
    selectValue: (value: number) => setConfig(configFor(config.mode, value)),
    // A click must not take the focus away from the typing input.
    keepTypingFocus: (event: MouseEvent) => event.preventDefault(),
  };
}
