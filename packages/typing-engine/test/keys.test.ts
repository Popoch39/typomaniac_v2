import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult, type Game } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

function keyDown(game: Game, code: string, at: number): Game {
  return applyEvent(game, { type: "keyDown", at, code });
}

function keyUp(game: Game, code: string, at: number): Game {
  return applyEvent(game, { type: "keyUp", at, code });
}

/** A 1-word words Game on "ab": "a" at 1000 ms, which starts the clock, "b" at `endAt`. */
function finishAt(game: Game, endAt: number): Game {
  return typeText(typeText(game, "a", 1000, 0), "b", endAt, 0);
}

function newGame(): Game {
  return createGame({ mode: "words", wordCount: 1 }, ["ab"]);
}

test("PRESS-1: a key press and a key release change neither the input nor the keystroke log", () => {
  const typing = typeText(
    createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]),
    "ca",
    0,
    100,
  );

  const pressed = keyDown(typing, "KeyT", 250);
  const released = keyUp(pressed, "KeyT", 320);

  expect(released).toEqual({ ...typing, keyPresses: released.keyPresses });
  expect(released.keyPresses).toEqual([{ at: 250, code: "KeyT", releasedAt: 320 }]);
  expect(typing.keyPresses).toEqual([]);
});

test("PRESS-1: a key press received before the first insertion does not start the clock", () => {
  const game = newGame();

  const pressed = keyDown(game, "KeyA", 990);

  expect(pressed.status).toBe("ready");
  expect(pressed.startedAt).toBeNull();
  // The clock starts with the insertion, 10 ms after the press.
  expect(getResult(finishAt(pressed, 3000)).duration).toBe(2);
});

test("END-2: a key Event applied to a finished Game is ignored", () => {
  const finished = finishAt(newGame(), 3000);

  expect(keyDown(finished, "KeyB", 3000)).toBe(finished);
  expect(keyUp(finished, "KeyB", 3050)).toBe(finished);
});

test("GAP-1: the Result holds the gaps between consecutive key presses, whatever the key", () => {
  // Presses 200, 390 and 800 ms after the start, the first two on the same key.
  const started = typeText(newGame(), "a", 1000, 0);
  const pressed = keyDown(keyDown(keyDown(started, "KeyA", 1200), "KeyA", 1390), "KeyB", 1800);

  const result = getResult(typeText(pressed, "b", 3000, 0));

  // 390 − 200 = 190, 800 − 390 = 410.
  expect(result.keyPressGaps).toEqual([190, 410]);
});

test("GAP-1: a Game played without any key Event still has a Result, with empty series", () => {
  const result = getResult(finishAt(newGame(), 3000));

  expect(result.keyPressGaps).toEqual([]);
  expect(result.keyHoldDurations).toEqual([]);
  expect(result.keyConsistency).toBe(0);
});

test("GAP-2: the gap after a press made before the start is measured from the start", () => {
  // Press 10 ms before the insertion that starts the clock, then 200 and 390 ms after it.
  const pressed = keyDown(newGame(), "KeyA", 990);
  const started = typeText(pressed, "a", 1000, 0);
  const typing = keyDown(keyDown(started, "KeyB", 1200), "KeyC", 1390);

  const result = getResult(typeText(typing, "b", 3000, 0));

  // 200 − 0 = 200, not 210, then 390 − 200 = 190.
  expect(result.keyPressGaps).toEqual([200, 190]);
});

test("PRESS-2: of the presses made before the start, only the last one is kept", () => {
  // Presses 300 and 10 ms before the start: the first one is dropped.
  const pressed = keyDown(keyDown(newGame(), "Tab", 700), "KeyA", 990);
  const started = typeText(pressed, "a", 1000, 0);
  const typing = keyDown(started, "KeyB", 1200);

  const result = getResult(typeText(typing, "b", 3000, 0));

  // A single gap, measured from the start: the press at 700 ms leaves none.
  expect(result.keyPressGaps).toEqual([200]);
});

test("PRESS-2: after a start Event, the presses made before the first insertion are all kept", () => {
  const started = applyEvent(newGame(), { type: "start", at: 500 });
  // Presses 490, 700 and 890 ms after the start Event.
  const pressed = keyDown(keyDown(keyDown(started, "KeyA", 990), "KeyB", 1200), "KeyC", 1390);

  const result = getResult(finishAt(pressed, 3000));

  expect(result.keyPressGaps).toEqual([210, 190]);
});

test("PRESS-3: a key release without a matching press is ignored", () => {
  const started = typeText(newGame(), "a", 1000, 0);

  const released = keyUp(started, "KeyA", 1050);

  expect(released).toBe(started);
  expect(getResult(typeText(released, "b", 3000, 0)).keyHoldDurations).toEqual([]);
});

test("PRESS-4: a key pressed again while still held has its first hold closed by the second press", () => {
  const started = typeText(newGame(), "a", 1000, 0);
  const typing = keyUp(keyDown(keyDown(started, "KeyA", 1000), "KeyA", 1300), "KeyA", 1380);

  const result = getResult(typeText(typing, "b", 3000, 0));

  // 1300 − 1000 = 300, then 1380 − 1300 = 80.
  expect(result.keyHoldDurations).toEqual([300, 80]);
});

test("HOLD-1: the Result holds one hold duration per key press, each release matched to the press of the same key", () => {
  // "KeyA" is pressed 10 ms before the start and still held when "KeyB" goes down.
  const pressed = keyDown(newGame(), "KeyA", 990);
  const started = typeText(pressed, "a", 1000, 0);
  const overlapping = keyUp(keyUp(keyDown(started, "KeyB", 1100), "KeyA", 1120), "KeyB", 1190);
  const typing = keyUp(keyDown(overlapping, "KeyA", 1300), "KeyA", 1380);

  const result = getResult(typeText(typing, "b", 3000, 0));

  // 1120 − 990 = 130, 1190 − 1100 = 90, 1380 − 1300 = 80.
  expect(result.keyHoldDurations).toEqual([130, 90, 80]);
});

test("HOLD-2: a key never released is given the mean duration of the complete holds, rounded to 2 decimals", () => {
  const started = typeText(newGame(), "a", 1000, 0);
  // Holds of 70, 80 and 85 ms, then "KeyD" stays down until the end.
  const first = keyUp(keyDown(started, "KeyA", 1000), "KeyA", 1070);
  const second = keyUp(keyDown(first, "KeyB", 1200), "KeyB", 1280);
  const third = keyUp(keyDown(second, "KeyC", 1400), "KeyC", 1485);
  const typing = keyDown(third, "KeyD", 1600);

  const result = getResult(typeText(typing, "b", 3000, 0));

  // (70 + 80 + 85) / 3 = 78.333…
  expect(result.keyHoldDurations).toEqual([70, 80, 85, 78.33]);
});

test("HOLD-2: without any complete hold, a key never released is given 80 ms", () => {
  const started = typeText(newGame(), "a", 1000, 0);
  const typing = keyDown(keyDown(started, "KeyA", 1000), "KeyB", 1200);

  const result = getResult(typeText(typing, "b", 3000, 0));

  expect(result.keyHoldDurations).toEqual([80, 80]);
});

test("HOLD-3: the press kept from before the start has a duration of 0 when its release came before the start too", () => {
  // "Tab" inserts nothing: pressed and released before the insertion that starts the clock.
  const pressed = keyUp(keyDown(newGame(), "Tab", 700), "Tab", 780);

  const result = getResult(finishAt(pressed, 3000));

  expect(result.keyHoldDurations).toEqual([0]);
});

test("KCONS-1: the key consistency is the consistency of the gaps between presses, without the last gap", () => {
  const started = typeText(newGame(), "a", 1000, 0);
  // Gaps 160, 240 and 500 ms.
  const typing = [1000, 1160, 1400, 1900].reduce(
    (current, at) => keyDown(current, "KeyA", at),
    started,
  );

  const result = getResult(typeText(typing, "b", 3000, 0));

  expect(result.keyPressGaps).toEqual([160, 240, 500]);
  // On 160 and 240: mean 200, population deviation 40, c = 0.2.
  // c + c³/3 + c⁵/5 = 0.202730…, tanh = 0.199998…: 100 × (1 − 0.199998) = 80.00.
  expect(result.keyConsistency).toBe(80);
});

test("KCONS-1: the key consistency is rounded to 2 decimals", () => {
  const started = typeText(newGame(), "a", 1000, 0);
  // Gaps 100, 300 and 50 ms.
  const typing = [1000, 1100, 1400, 1450].reduce(
    (current, at) => keyDown(current, "KeyA", at),
    started,
  );

  const result = getResult(typeText(typing, "b", 3000, 0));

  // On 100 and 300: mean 200, deviation 100, c = 0.5.
  // c + c³/3 + c⁵/5 = 0.547916…, tanh = 0.498957…: 50.10.
  expect(result.keyConsistency).toBe(50.1);
});

test("KCONS-2: with a single gap, nothing is left once the last gap is removed: the key consistency is 0", () => {
  const started = typeText(newGame(), "a", 1000, 0);
  const typing = keyDown(keyDown(started, "KeyA", 1000), "KeyB", 1200);

  const result = getResult(typeText(typing, "b", 3000, 0));

  expect(result.keyPressGaps).toEqual([200]);
  expect(result.keyConsistency).toBe(0);
});
