export type GameConfig =
  | { readonly mode: "words"; readonly wordCount: number }
  | { readonly mode: "time"; readonly seconds: number };

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
export type GameEvent =
  | { readonly type: "insert"; readonly at: number; readonly text: string }
  | { readonly type: "delete"; readonly at: number; readonly unit: DeletionUnit }
  | { readonly type: "tick"; readonly at: number }
  | { readonly type: "addWords"; readonly words: readonly string[] };

export type DeletionUnit = "char" | "word";

export const SEPARATOR = " ";
const MAX_EXTRA_CHARS = 20;
// What a word deletion removes: the last run of non-blank characters with the blanks after it,
// or the trailing blanks when the input has nothing else.
const LAST_TYPED_BLOCK = /(?:\S+\s*|\s+)$/;
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
  if (config.mode === "time") {
    if (!Number.isFinite(config.seconds) || config.seconds <= 0) {
      throw new RangeError(
        `A time game needs a strictly positive finite duration (seconds: ${config.seconds}).`,
      );
    }
    // The text of a time game has no end: no word is the last one, so every word keeps its separator.
    return newGame(config, words.map(withSeparator));
  }
  const { wordCount } = config;
  if (!Number.isInteger(wordCount) || wordCount < 1 || words.length < wordCount) {
    throw new RangeError(
      `A words game needs a positive integer word count and at least that many words (word count: ${wordCount}, words: ${words.length}).`,
    );
  }
  const targetWords = words
    .slice(0, wordCount)
    .map((word, index) => (index === wordCount - 1 ? word : withSeparator(word)));
  return newGame(config, targetWords);
}

function withSeparator(word: string): string {
  return word + SEPARATOR;
}

function newGame(config: GameConfig, targetWords: readonly string[]): Game {
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
  if (event.type === "delete") return deleteInput(game, event.unit);
  if (event.type === "tick") return tick(game, event.at);
  if (event.type === "addWords") return addWords(game, event.words);
  // UTF-16 units, not code points: positions in a target word are counted the same way.
  return event.text.split("").reduce((current, char) => insertChar(current, char, event.at), game);
}

function tick(game: Game, at: number): Game {
  const { config, startedAt } = game;
  if (config.mode !== "time" || startedAt === null || game.status === "finished") return game;
  // The end is not cut at the limit: whatever was typed before this Tick stays in the game.
  if (at - startedAt < config.seconds * 1000) return game;
  return { ...game, status: "finished", endedAt: at };
}

function addWords(game: Game, words: readonly string[]): Game {
  // The last word of a words game has no separator: nothing can follow it.
  if (game.config.mode !== "time" || game.status === "finished") return game;
  return {
    ...game,
    targetWords: [...game.targetWords, ...words.map(withSeparator)],
    inputs: [...game.inputs, ...words.map(() => "")],
  };
}

function insertChar(game: Game, typedChar: string, at: number): Game {
  if (game.status === "finished") return game;

  const char = TYPABLE_SPACES.has(typedChar) ? SEPARATOR : typedChar;
  const { activeWordIndex, targetWords } = game;
  const target = targetWords[activeWordIndex];
  // A time game whose words are all validated waits for more: nothing can be judged meanwhile.
  if (target === undefined) return game;
  const input = game.inputs[activeWordIndex] ?? "";
  const validates = char === SEPARATOR;
  // Refused before being judged: it leaves no keystroke and does not start the clock.
  if (validates && input === "") return game;
  // A space is never refused here, so a full word can always be validated.
  if (!validates && input.length >= target.length + MAX_EXTRA_CHARS) return game;

  const isLastWord = game.config.mode === "words" && activeWordIndex === targetWords.length - 1;
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

function deleteInput(game: Game, unit: DeletionUnit): Game {
  if (game.status === "finished") return game;

  const { activeWordIndex } = game;
  const input = game.inputs[activeWordIndex] ?? "";
  if (input !== "") {
    const nextInput = unit === "char" ? input.slice(0, -1) : input.replace(LAST_TYPED_BLOCK, "");
    return withInput(game, activeWordIndex, nextInput);
  }

  const previousWordIndex = activeWordIndex - 1;
  const previousInput = game.inputs[previousWordIndex] ?? "";
  if (activeWordIndex === 0 || previousInput === game.targetWords[previousWordIndex]) return game;
  // A validated word always ends with the space that validated it: going back takes it off.
  const restoredInput = unit === "char" ? previousInput.slice(0, -1) : "";
  return {
    ...withInput(game, previousWordIndex, restoredInput),
    activeWordIndex: previousWordIndex,
  };
}

function withInput(game: Game, wordIndex: number, input: string): Game {
  return {
    ...game,
    inputs: game.inputs.map((current, index) => (index === wordIndex ? input : current)),
  };
}
