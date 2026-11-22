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
import { nextPracticeClock, type PracticeClock } from "../clock/practiceClock.ts";
import { withoutSeparator } from "../words/withoutSeparator.ts";

const DEFAULT_CONFIG: GameConfig = { mode: "time", seconds: 30 };
const TICK_INTERVAL_MS = 1000;
// Ten readings a second make the Live stats follow the typing without reading them on every frame.
const READ_INTERVAL_MS = 100;
const TIME_GAME_INITIAL_WORDS = 50;
// A time Game has no last word: it is topped up before the player can reach the end of its text.
const TIME_GAME_MIN_WORDS_AHEAD = 20;
const TIME_GAME_ADDED_WORDS = 50;

type GameState = {
  readonly game: Game;
  /**
   * The instant the Live stats are read at: it never goes back. A running Game moves it forward on a
   * timer, on each Tick and on each Event; a finished one is read at its end.
   */
  readonly readAt: number;
  /** Keys the typing area, so a restart or a config change remounts it and its input takes the focus again. */
  readonly restartCount: number;
  /** The last Event applied, `null` in a new Game: what a Duel forwards to the server. */
  readonly lastEvent: GameEvent | null;
  /** Whether words are added as the end of a time Game nears: a loaded Game keeps its given words. */
  readonly topsUpWords: boolean;
  /**
   * Whether the Game refuses every Event and stops ticking, until another Game replaces it: what a
   * Duel's server would not count, such as keys typed while its link is down, never reaches it.
   */
  readonly isFrozen: boolean;
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
  /** Freezes the Game on screen as it is. */
  readonly freeze: () => void;
  /** Abandons the Game for a new ready one, so a page left mid-Game leaves no clock running. */
  readonly leave: () => void;
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
let clock: PracticeClock = { kind: "idle" };
let tickTimer: ReturnType<typeof setInterval> | undefined;
let readTimer: ReturnType<typeof setInterval> | undefined;

function stopTickingAndReading() {
  clearInterval(tickTimer);
  clearInterval(readTimer);
}

export const useGameStore = create<GameState>()((set, get) => {
  // A late refresh, Tick or Event must not move the Live stats back to an earlier reading.
  const readAtLeast = (at: number) => Math.max(get().readAt, at);

  const tick = () => {
    const event: GameEvent = { type: "tick", at: eventTime() };
    const game = applyEngineEvent(get().game, event);
    set({ game, readAt: readAtLeast(game.endedAt ?? event.at), lastEvent: event });
    followGame();
  };

  // Not an Event: it is not applied to the Game nor forwarded, so Ticks stay at one per second.
  const refreshReadAt = () => set({ readAt: readAtLeast(eventTime()) });

  const startTickingAndReading = () => {
    stopTickingAndReading();
    // One Tick per second from the start keeps Monkeytype parity (ADR 0003).
    tickTimer = setInterval(tick, TICK_INTERVAL_MS);
    readTimer = setInterval(refreshReadAt, READ_INTERVAL_MS);
  };

  // The only place the timers start or stop: they follow the Game's status, whatever changed it.
  const followGame = () => {
    const { game, isFrozen } = get();
    const step = nextPracticeClock(clock, game, isFrozen);
    clock = step.clock;
    if (step.effect === "start") startTickingAndReading();
    if (step.effect === "stop") stopTickingAndReading();
  };

  const readAtAfter = (game: Game, event: GameEvent) => {
    // Read at its end, as its own Live stats are, so the Opponent is read up to the same elapsed time.
    if (game.endedAt !== null) return readAtLeast(game.endedAt);
    // Without it, what typing changes is read against the last Tick, up to a second behind.
    if (game.status === "running" && event.type !== "addWords") return readAtLeast(event.at);
    return get().readAt;
  };

  const replaceGame = (game: Game, topsUpWords: boolean) => {
    set((state) => ({
      game,
      readAt: eventTime(),
      restartCount: state.restartCount + 1,
      lastEvent: null,
      topsUpWords,
      isFrozen: false,
    }));
    followGame();
  };

  const startNewGame = (config: GameConfig) => replaceGame(newGame(config), true);
  const restart = () => startNewGame(get().game.config);

  return {
    game: newGame(DEFAULT_CONFIG),
    readAt: eventTime(),
    restartCount: 0,
    lastEvent: null,
    topsUpWords: true,
    isFrozen: false,
    applyEvent: (event) => {
      const { game: before, topsUpWords, isFrozen } = get();
      if (isFrozen) return;
      const applied = applyEngineEvent(before, event);
      const game = topsUpWords ? withEnoughWords(applied) : applied;
      if (before.status === "ready" && game.status === "running") {
        set({ game, readAt: game.startedAt ?? eventTime(), lastEvent: event });
      } else {
        set({ game, readAt: readAtAfter(game, event), lastEvent: event });
      }
      followGame();
    },
    loadGame: (config, words, journal = []) => {
      replaceGame(journal.reduce(applyEngineEvent, createGame(config, words)), false);
      if (get().game.status !== "running") return;
      // The clock ran on while the Game was away: one already past its end ends at once.
      tick();
    },
    restart,
    freeze: () => {
      set({ isFrozen: true });
      followGame();
    },
    leave: restart,
    setConfig: startNewGame,
  };
});
