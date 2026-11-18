import { drawWords } from "@repo/duel-engine";
import {
  applyEvent as applyEngineEvent,
  createGame,
  type Game,
  type GameConfig,
  type GameEvent,
} from "@repo/typing-engine";
import { create } from "zustand";
import { eventTime } from "../clock/eventTime.ts";
import { withoutSeparator } from "../words/withoutSeparator.ts";

const DEFAULT_CONFIG: GameConfig = { mode: "time", seconds: 30 };
const TICK_INTERVAL_MS = 1000;
const TIME_GAME_INITIAL_WORDS = 50;
// A time Game has no last word: it is topped up before the player can reach the end of its text.
const TIME_GAME_MIN_WORDS_AHEAD = 20;
const TIME_GAME_ADDED_WORDS = 50;

type GameState = {
  readonly game: Game;
  /** The instant the Live stats are read at, refreshed on each Tick. */
  readonly readAt: number;
  /** Keys the typing area, so a restart or a config change remounts it and its input takes the focus again. */
  readonly restartCount: number;
  readonly applyEvent: (event: GameEvent) => void;
  readonly restart: () => void;
  readonly setConfig: (config: GameConfig) => void;
};

function newGame(config: GameConfig) {
  const wordCount = config.mode === "time" ? TIME_GAME_INITIAL_WORDS : config.wordCount;
  return createGame(config, drawWords(wordCount, Math.random));
}

function withEnoughWords(game: Game) {
  const wordsAhead = game.targetWords.length - game.activeWordIndex - 1;
  if (game.config.mode !== "time" || wordsAhead >= TIME_GAME_MIN_WORDS_AHEAD) return game;
  const lastTarget = game.targetWords.at(-1);
  const lastWord = lastTarget === undefined ? undefined : withoutSeparator(lastTarget);
  const words = drawWords(TIME_GAME_ADDED_WORDS, Math.random, lastWord);
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
    const at = eventTime();
    const game = applyEngineEvent(get().game, { type: "tick", at });
    set({ game, readAt: at });
    if (game.status === "finished") stopTicking();
  };

  const startNewGame = (config: GameConfig) => {
    stopTicking();
    set((state) => ({
      game: newGame(config),
      readAt: eventTime(),
      restartCount: state.restartCount + 1,
    }));
  };

  return {
    game: newGame(DEFAULT_CONFIG),
    readAt: eventTime(),
    restartCount: 0,
    applyEvent: (event) => {
      const before = get().game;
      const game = withEnoughWords(applyEngineEvent(before, event));
      if (before.status === "ready" && game.status === "running") {
        set({ game, readAt: game.startedAt ?? eventTime() });
        // One Tick per second from the start keeps Monkeytype parity (ADR 0003).
        tickTimer = setInterval(tick, TICK_INTERVAL_MS);
      } else {
        set({ game });
      }
      if (game.status === "finished") stopTicking();
    },
    restart: () => startNewGame(get().game.config),
    setConfig: startNewGame,
  };
});
