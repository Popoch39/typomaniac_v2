import {
  applyEvent as applyEngineEvent,
  createGame,
  type Game,
  type GameConfig,
  type GameEvent,
} from "@repo/typing-engine";
import { create } from "zustand";
import { drawWords } from "../words/drawWords.ts";

const config = { mode: "words", wordCount: 10 } as const satisfies GameConfig;

type GameState = {
  readonly game: Game;
  /** Keys the typing area, so a restart remounts it and its input takes the focus again. */
  readonly restartCount: number;
  readonly applyEvent: (event: GameEvent) => void;
  readonly restart: () => void;
};

function newGame() {
  return createGame(config, drawWords(config.wordCount));
}

export const useGameStore = create<GameState>()((set) => ({
  game: newGame(),
  restartCount: 0,
  applyEvent: (event) => set((state) => ({ game: applyEngineEvent(state.game, event) })),
  restart: () => set((state) => ({ game: newGame(), restartCount: state.restartCount + 1 })),
}));
