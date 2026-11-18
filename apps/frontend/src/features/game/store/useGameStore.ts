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
  /** The last Event applied, `null` in a new Game: what a Duel forwards to the server. */
  readonly lastEvent: GameEvent | null;
  /** Whether words are added as the end of a time Game nears: a loaded Game keeps its given words. */
  readonly topsUpWords: boolean;
  readonly applyEvent: (event: GameEvent) => void;
  /**
   * Replaces the Game with one on given words, such as the Target words of a Duel; none is added.
   * A journal replays the Events already applied, to resume a Game whose clock kept running.
   */
  readonly loadGame: (
    config: GameConfig,
    words: readonly string[],
    journal?: readonly GameEvent[],
  ) => void;
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
    const event: GameEvent = { type: "tick", at: eventTime() };
    const game = applyEngineEvent(get().game, event);
    set({ game, readAt: event.at, lastEvent: event });
    if (game.status === "finished") stopTicking();
  };

  const replaceGame = (game: Game, topsUpWords: boolean) => {
    stopTicking();
    set((state) => ({
      game,
      readAt: eventTime(),
      restartCount: state.restartCount + 1,
      lastEvent: null,
      topsUpWords,
    }));
  };

  const startNewGame = (config: GameConfig) => replaceGame(newGame(config), true);

  return {
    game: newGame(DEFAULT_CONFIG),
    readAt: eventTime(),
    restartCount: 0,
    lastEvent: null,
    topsUpWords: true,
    applyEvent: (event) => {
      const { game: before, topsUpWords } = get();
      const applied = applyEngineEvent(before, event);
      const game = topsUpWords ? withEnoughWords(applied) : applied;
      if (before.status === "ready" && game.status === "running") {
        set({ game, readAt: game.startedAt ?? eventTime(), lastEvent: event });
        // One Tick per second from the start keeps Monkeytype parity (ADR 0003).
        tickTimer = setInterval(tick, TICK_INTERVAL_MS);
      } else {
        set({ game, lastEvent: event });
      }
      if (game.status === "finished") stopTicking();
    },
    loadGame: (config, words, journal = []) => {
      replaceGame(journal.reduce(applyEngineEvent, createGame(config, words)), false);
      if (get().game.status !== "running") return;
      tickTimer = setInterval(tick, TICK_INTERVAL_MS);
      // The clock ran on while the Game was away: one already past its end ends at once.
      tick();
    },
    restart: () => startNewGame(get().game.config),
    setConfig: startNewGame,
  };
});
