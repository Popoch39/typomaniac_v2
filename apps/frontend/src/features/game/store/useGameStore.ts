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
  readonly applyEvent: (event: GameEvent) => void;
};

export const useGameStore = create<GameState>()((set) => ({
  game: createGame(config, drawWords(config.wordCount)),
  applyEvent: (event) => set((state) => ({ game: applyEngineEvent(state.game, event) })),
}));
