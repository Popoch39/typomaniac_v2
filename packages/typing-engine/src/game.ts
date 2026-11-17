export type GameConfig = { readonly mode: "words"; readonly wordCount: number };

export type GameStatus = "ready" | "running" | "finished";

export type Game = {
  readonly config: GameConfig;
  readonly targetWords: readonly string[];
  readonly inputs: readonly string[];
  readonly activeWordIndex: number;
  readonly status: GameStatus;
  /** Client timestamp in milliseconds, `null` until the clock starts. */
  readonly startedAt: number | null;
  /** Client timestamp in milliseconds, `null` until the game is finished. */
  readonly endedAt: number | null;
};

/** `at` is the client timestamp in milliseconds. */
export type GameEvent = { readonly type: "insert"; readonly at: number; readonly text: string };

const SEPARATOR = " ";

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
    startedAt: null,
    endedAt: null,
  };
}

export function applyEvent(game: Game, event: GameEvent): Game {
  // UTF-16 units, not code points: positions in a target word are counted the same way.
  return event.text.split("").reduce((current, char) => insertChar(current, char, event.at), game);
}

function insertChar(game: Game, char: string, at: number): Game {
  if (game.status === "finished") return game;

  const { activeWordIndex, targetWords } = game;
  const inputs = game.inputs.map((input, index) =>
    index === activeWordIndex ? input + char : input,
  );
  const running: Game = { ...game, inputs, status: "running", startedAt: game.startedAt ?? at };

  if (inputs[activeWordIndex] !== targetWords[activeWordIndex]) return running;
  if (activeWordIndex === targetWords.length - 1) {
    return { ...running, status: "finished", endedAt: at };
  }
  return { ...running, activeWordIndex: activeWordIndex + 1 };
}
