export type GameConfig = { readonly mode: "words"; readonly wordCount: number };

export type GameStatus = "ready" | "running" | "finished";

/** A text insertion judged by the engine. */
export type Keystroke = {
  /** Client timestamp in milliseconds. */
  readonly at: number;
  readonly wordIndex: number;
  /** Position in the word: the length of its input before the insertion. */
  readonly charIndex: number;
  readonly char: string;
  readonly correct: boolean;
};

export type Game = {
  readonly config: GameConfig;
  readonly targetWords: readonly string[];
  readonly inputs: readonly string[];
  readonly activeWordIndex: number;
  readonly status: GameStatus;
  readonly keystrokes: readonly Keystroke[];
  /** Client timestamp in milliseconds, `null` until the clock starts. */
  readonly startedAt: number | null;
  /** Client timestamp in milliseconds, `null` until the game is finished. */
  readonly endedAt: number | null;
};

/** `at` is the client timestamp in milliseconds. */
export type GameEvent = { readonly type: "insert"; readonly at: number; readonly text: string };

export const SEPARATOR = " ";
const MAX_EXTRA_CHARS = 20;
// Monkeytype's own list, not a generic whitespace test: U+2000, U+2001, U+2005, U+2006, U+205F,
// tab and newline are deliberately absent.
const TYPABLE_SPACES: ReadonlySet<string> = new Set([
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  "​",
  " ",
  "　",
  "﻿",
]);

export function createGame(config: GameConfig, words: readonly string[]): Game {
  const { wordCount } = config;
  if (!Number.isInteger(wordCount) || wordCount < 1 || words.length < wordCount) {
    throw new RangeError(
      `A words game needs a positive integer word count and at least that many words (word count: ${wordCount}, words: ${words.length}).`,
    );
  }
  const targetWords = words
    .slice(0, wordCount)
    .map((word, index) => (index === wordCount - 1 ? word : word + SEPARATOR));
  return {
    config,
    targetWords,
    inputs: targetWords.map(() => ""),
    activeWordIndex: 0,
    status: "ready",
    keystrokes: [],
    startedAt: null,
    endedAt: null,
  };
}

export function applyEvent(game: Game, event: GameEvent): Game {
  // UTF-16 units, not code points: positions in a target word are counted the same way.
  return event.text.split("").reduce((current, char) => insertChar(current, char, event.at), game);
}

function insertChar(game: Game, typedChar: string, at: number): Game {
  if (game.status === "finished") return game;

  const char = TYPABLE_SPACES.has(typedChar) ? SEPARATOR : typedChar;
  const { activeWordIndex, targetWords } = game;
  const target = targetWords[activeWordIndex] ?? "";
  const input = game.inputs[activeWordIndex] ?? "";
  const validates = char === SEPARATOR;
  // Refused before being judged: it leaves no keystroke and does not start the clock.
  if (validates && input === "") return game;
  // A space is never refused here, so a full word can always be validated.
  if (!validates && input.length >= target.length + MAX_EXTRA_CHARS) return game;

  const isLastWord = activeWordIndex === targetWords.length - 1;
  // The last word has no separator: the space that validates it is judged, but never stored.
  const nextInput = validates && isLastWord ? input : input + char;
  const keystroke: Keystroke = {
    at,
    wordIndex: activeWordIndex,
    charIndex: input.length,
    char,
    correct: target[input.length] === char,
  };
  const running: Game = {
    ...game,
    inputs: game.inputs.map((current, index) => (index === activeWordIndex ? nextInput : current)),
    status: "running",
    keystrokes: [...game.keystrokes, keystroke],
    startedAt: game.startedAt ?? at,
  };

  if (isLastWord) {
    if (!validates && nextInput !== target) return running;
    return { ...running, status: "finished", endedAt: at };
  }
  if (!validates) return running;
  return { ...running, activeWordIndex: activeWordIndex + 1 };
}
