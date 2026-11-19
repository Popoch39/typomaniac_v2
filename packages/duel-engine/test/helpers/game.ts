import { applyEvent, createGame, type Game } from "@repo/typing-engine";
import { DUEL_GAME_CONFIG } from "../../src/index.ts";

/** A Duel Game of `wordCount` five-character words, space included, each typed without a mistake. */
export function perfectGame(wordCount: number): Game {
  return applyEvent(
    createGame(
      DUEL_GAME_CONFIG,
      Array.from({ length: 60 }, () => "four"),
    ),
    {
      type: "insert",
      at: 0,
      text: "four ".repeat(wordCount),
    },
  );
}
