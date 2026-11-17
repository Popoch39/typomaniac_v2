import { applyEvent, type Game } from "../../src/index.ts";

/** Types `text` one character per insertion, the first at `from` ms and the next ones every `step` ms. */
export function typeText(game: Game, text: string, from: number, step: number): Game {
  return Array.from(text).reduce(
    (current, char, index) =>
      applyEvent(current, { type: "insert", at: from + index * step, text: char }),
    game,
  );
}
