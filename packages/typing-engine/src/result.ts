import type { Game } from "./game.ts";

export type Result = {
  /** Seconds, rounded to 2 decimals. */
  readonly duration: number;
  readonly wpm: number;
  readonly rawWpm: number;
};

export function getResult(game: Game): Result {
  if (game.startedAt === null || game.endedAt === null) {
    throw new Error("The game is not finished: it has no result yet.");
  }

  // The speeds are computed from the rounded duration, as Monkeytype does.
  const duration = roundTo2((game.endedAt - game.startedAt) / 1000);
  const exactWordChars = game.targetWords
    .filter((target, index) => game.inputs[index] === target)
    .reduce((total, target) => total + target.length, 0);
  const typedChars = game.inputs.reduce((total, input) => total + input.length, 0);

  return {
    duration,
    wpm: roundTo2(wordsPerMinute(exactWordChars, duration)),
    rawWpm: roundTo2(wordsPerMinute(typedChars, duration)),
  };
}

function wordsPerMinute(chars: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return chars / 5 / (seconds / 60);
}

function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
