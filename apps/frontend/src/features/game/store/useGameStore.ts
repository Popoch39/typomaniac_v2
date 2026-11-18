import {
  applyEvent as applyEngineEvent,
  createGame,
  type Game,
  type GameConfig,
  type GameEvent,
} from "@repo/typing-engine";
import { create } from "zustand";
import { drawWords } from "../words/drawWords.ts";

const DEFAULT_CONFIG: GameConfig = { mode: "time", seconds: 30 };
const TICK_INTERVAL_MS = 1000;
const TIME_GAME_INITIAL_WORDS = 50;
// A time Game has no last word: it is topped up before the person can reach the end of its text.
const TIME_GAME_MIN_WORDS_AHEAD = 20;
const TIME_GAME_ADDED_WORDS = 50;

type GameState = {
  readonly config: GameConfig;
  readonly game: Game;
  /** The instant the Live stats are read at, refreshed on each Tick. */
  readonly readAt: number;
  readonly applyEvent: (event: GameEvent) => void;
  readonly restart: () => void;
  readonly setConfig: (config: GameConfig) => void;
};

// Monotonic and sub-millisecond, in epoch milliseconds so a server can bound it against receipt.
function now() {
  return performance.timeOrigin + performance.now();
}

function newGame(config: GameConfig) {
  const wordCount = config.mode === "time" ? TIME_GAME_INITIAL_WORDS : config.wordCount;
  return createGame(config, drawWords(wordCount));
}

function withEnoughWords(game: Game) {
  const wordsAhead = game.targetWords.length - game.activeWordIndex - 1;
  if (game.config.mode !== "time" || wordsAhead >= TIME_GAME_MIN_WORDS_AHEAD) return game;
  const lastWord = game.targetWords.at(-1)?.trimEnd();
  const words = drawWords(TIME_GAME_ADDED_WORDS, lastWord);
  return applyEngineEvent(game, { type: "addWords", words });
}

// Owned by the store because components may not run effects; at most one Game ticks at a time.
let tickTimer: ReturnType<typeof setInterval> | null = null;

function stopTicking() {
  if (tickTimer === null) return;
  clearInterval(tickTimer);
  tickTimer = null;
}

export const useGameStore = create<GameState>()((set, get) => {
  const tick = () => {
    const at = now();
    const game = applyEngineEvent(get().game, { type: "tick", at });
    set({ game, readAt: at });
    if (game.status === "finished") stopTicking();
  };

  const startNewGame = (config: GameConfig) => {
    stopTicking();
    set({ config, game: newGame(config), readAt: now() });
  };

  return {
    config: DEFAULT_CONFIG,
    game: newGame(DEFAULT_CONFIG),
    readAt: now(),
    applyEvent: (event) => {
      const before = get().game;
      const game = withEnoughWords(applyEngineEvent(before, event));
      if (before.status === "ready" && game.status === "running") {
        set({ game, readAt: game.startedAt ?? now() });
        // One Tick per second from the start keeps Monkeytype parity (ADR 0003).
        tickTimer = setInterval(tick, TICK_INTERVAL_MS);
      } else {
        set({ game });
      }
      if (game.status === "finished") stopTicking();
    },
    restart: () => startNewGame(get().config),
    setConfig: startNewGame,
  };
});
