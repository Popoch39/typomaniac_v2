import { expect, test } from "bun:test";
import { applyEvent, createGame } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

test("GAME-4: a time Game is created with a duration in seconds and keeps every word of the list", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["ab", "cd", "ef"]);

  expect(game.config).toEqual({ mode: "time", seconds: 15 });
  expect(game.targetWords).toHaveLength(3);
  expect(game.inputs).toEqual(["", "", ""]);
  expect(game.activeWordIndex).toBe(0);
  expect(game.status).toBe("ready");
});

test("GAME-5: creating a time Game is refused when the duration is not a strictly positive finite number", () => {
  expect(() => createGame({ mode: "time", seconds: 0 }, ["ab"])).toThrow(RangeError);
  expect(() => createGame({ mode: "time", seconds: -15 }, ["ab"])).toThrow(RangeError);
  expect(() => createGame({ mode: "time", seconds: Number.NaN }, ["ab"])).toThrow(RangeError);
  expect(() => createGame({ mode: "time", seconds: Infinity }, ["ab"])).toThrow(RangeError);
});

test("SEP-2: in a time Game every target word carries a separator, the last one of the list included", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["ab", "cd", "ef"]);

  expect(game.targetWords).toEqual(["ab ", "cd ", "ef "]);
});

test("SEP-2: the words added to a time Game carry a separator too", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["ab"]);

  const longer = applyEvent(game, { type: "addWords", words: ["cd", "ef"] });

  expect(longer.targetWords).toEqual(["ab ", "cd ", "ef "]);
});

test("ADD-1: adding words extends the target words with an empty input each, without touching the current input", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["ab", "cd"]);
  const typing = typeText(game, "ab c", 1000, 100);

  const longer = applyEvent(typing, { type: "addWords", words: ["ef", "gh"] });

  expect(longer).toEqual({
    ...typing,
    targetWords: ["ab ", "cd ", "ef ", "gh "],
    inputs: ["ab ", "c", "", ""],
  });
});

test("ADD-1: adding words to a Game that has not started does not start it", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["ab"]);

  const longer = applyEvent(game, { type: "addWords", words: ["cd"] });

  expect(longer.status).toBe("ready");
  expect(longer.startedAt).toBeNull();
});

test("ADD-2: adding words to a words Game is ignored", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  expect(applyEvent(game, { type: "addWords", words: ["ef"] })).toEqual(game);
});

test("ADD-3: validating the last available word of a time Game does not end it, and the active word waits beyond the list", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["ab", "cd"]);

  const waiting = typeText(game, "ab cd ", 0, 100);

  expect(waiting.status).toBe("running");
  expect(waiting.inputs).toEqual(["ab ", "cd "]);
  expect(waiting.activeWordIndex).toBe(2);
});

test("ADD-3: an insertion is refused while the active word waits for words, then accepted once words are added", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["ab"]);
  const waiting = typeText(game, "ab ", 0, 100);

  expect(applyEvent(waiting, { type: "insert", at: 300, text: "c" })).toEqual(waiting);

  const longer = applyEvent(waiting, { type: "addWords", words: ["cd"] });
  const typing = applyEvent(longer, { type: "insert", at: 400, text: "c" });
  expect(typing.inputs).toEqual(["ab ", "c"]);
  expect(typing.keystrokes).toHaveLength(4);
});

test("ADD-3: a deletion while the active word waits for words goes back to an incorrect last word", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["ab"]);
  const waiting = typeText(game, "ax ", 0, 100);

  const back = applyEvent(waiting, { type: "delete", at: 300, unit: "char" });

  expect(back.activeWordIndex).toBe(0);
  expect(back.inputs).toEqual(["ax"]);
});

test("ADD-3: an insertion on a time Game without any word is refused and does not start the clock", () => {
  const game = createGame({ mode: "time", seconds: 15 }, []);

  expect(applyEvent(game, { type: "insert", at: 0, text: "a" })).toEqual(game);
});

test("TICK-1: a Tick received before the first insertion neither starts nor ends the Game", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["ab", "cd"]);

  const ticked = applyEvent(game, { type: "tick", at: 5000 });

  expect(ticked).toEqual(game);
  // The clock starts at the first insertion, not at the earlier Tick.
  const started = applyEvent(ticked, { type: "insert", at: 6000, text: "a" });
  expect(started.startedAt).toBe(6000);
  expect(applyEvent(started, { type: "tick", at: 7999 }).status).toBe("running");
});

test("TICK-2: a Tick whose elapsed time is below the limit does not end the Game", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["ab", "cd"]);
  const typing = typeText(game, "ab", 1000, 100);

  // 1 ms before the limit, counted from the first insertion at 1000 ms.
  expect(applyEvent(typing, { type: "tick", at: 2999 })).toEqual(typing);
});

test("TICK-3: a Tick never ends a words Game", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  const typing = typeText(game, "ab", 0, 100);

  expect(applyEvent(typing, { type: "tick", at: 3_600_000 })).toEqual(typing);
});

test("END-4: a time Game ends at the Tick whose elapsed time is exactly the limit", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["ab", "cd"]);
  const typing = typeText(game, "ab", 1000, 100);

  const finished = applyEvent(typing, { type: "tick", at: 3000 });

  expect(finished).toEqual({ ...typing, status: "finished", endedAt: 3000 });
});

test("END-4: a time Game ends at the first Tick that reaches the limit, and later Ticks are ignored", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["ab", "cd"]);
  const typing = applyEvent(typeText(game, "ab", 1000, 100), { type: "tick", at: 2000 });

  const finished = applyEvent(typing, { type: "tick", at: 3004 });

  expect(finished.status).toBe("finished");
  expect(finished.endedAt).toBe(3004);
  expect(applyEvent(finished, { type: "tick", at: 4000 })).toEqual(finished);
});

test("END-5: the keystrokes that arrive after the limit but before the ending Tick count", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["ab", "cd"]);
  const typing = typeText(game, "ab", 0, 100);

  const late = applyEvent(typing, { type: "insert", at: 2003, text: " " });
  const finished = applyEvent(late, { type: "tick", at: 2005 });

  expect(finished.inputs).toEqual(["ab ", ""]);
  expect(finished.keystrokes).toHaveLength(3);
});

test("END-2: an insertion or added words applied after the ending Tick do not change a time Game", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["ab", "cd"]);
  const finished = applyEvent(typeText(game, "ab", 0, 100), { type: "tick", at: 2000 });

  expect(applyEvent(finished, { type: "insert", at: 2001, text: " " })).toEqual(finished);
  expect(applyEvent(finished, { type: "addWords", words: ["ef"] })).toEqual(finished);
});

test("PURE-1: a Tick and added words never modify the Game received as input", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["ab"]);
  const typing = typeText(game, "a", 0, 100);
  const snapshot = structuredClone(typing);

  applyEvent(typing, { type: "addWords", words: ["cd"] });
  applyEvent(typing, { type: "tick", at: 2000 });

  expect(typing).toEqual(snapshot);
});
