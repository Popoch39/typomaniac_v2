import { afterEach, expect, test } from "bun:test";
import { useGameStore } from "../src/features/game/store/useGameStore.ts";

const store = useGameStore;
const loadedWords = ["loaded ", "round ", "words "];

function typeActiveWord() {
  const { game, applyEvent } = store.getState();
  const word = game.targetWords[game.activeWordIndex];
  if (word === undefined) throw new Error("no active word");
  applyEvent({ type: "insert", at: performance.timeOrigin + performance.now(), text: word });
}

// A started Game ticks on a timer: a new ready Game stops it so no test leaves one running.
afterEach(() => store.getState().setConfig({ mode: "words", wordCount: 10 }));

test("restarting after a Game loaded on given words gives a ready Game on newly drawn Target words, topped up", () => {
  store.getState().loadGame({ mode: "time", seconds: 30 }, loadedWords);

  store.getState().restart();

  const { game, topsUpWords } = store.getState();
  expect(game.status).toBe("ready");
  expect(game.targetWords).not.toEqual(loadedWords);
  expect(game.targetWords.length).toBeGreaterThan(loadedWords.length);
  expect(topsUpWords).toBe(true);
});

test("a restarted time Game keeps being topped up as the active word advances", () => {
  store.getState().loadGame({ mode: "time", seconds: 120 }, loadedWords);
  store.getState().restart();
  const initialWordCount = store.getState().game.targetWords.length;

  while (store.getState().game.activeWordIndex < initialWordCount - 1) typeActiveWord();

  const { game } = store.getState();
  expect(game.status).toBe("running");
  expect(game.targetWords.length).toBeGreaterThan(initialWordCount);
});

test("an Event of a running Game moves the instant the Live stats are read at to its own", () => {
  const start = performance.timeOrigin + performance.now();
  store.getState().setConfig({ mode: "time", seconds: 30 });
  store.getState().applyEvent({ type: "start", at: start });

  store.getState().applyEvent({ type: "insert", at: start + 400, text: "a" });

  expect(store.getState().readAt).toBe(start + 400);
});

test("the instant the Live stats are read at moves forward between two Ticks, without adding an Event", async () => {
  const start = performance.timeOrigin + performance.now();
  store.getState().setConfig({ mode: "time", seconds: 30 });
  store.getState().applyEvent({ type: "start", at: start });
  const startEvent = store.getState().lastEvent;

  await Bun.sleep(250);

  expect(store.getState().readAt).toBeGreaterThan(start + 100);
  expect(store.getState().lastEvent).toBe(startEvent);
});

test("a running Game loaded mid-Game has its Live stats read further on between two Ticks", async () => {
  const start = performance.timeOrigin + performance.now() - 5000;
  store
    .getState()
    .loadGame({ mode: "time", seconds: 30 }, loadedWords, [{ type: "start", at: start }]);
  const loadedAt = store.getState().readAt;

  await Bun.sleep(250);

  expect(store.getState().readAt).toBeGreaterThan(loadedAt + 100);
});

test("the instant the Live stats are read at stops moving once the Game is restarted", async () => {
  store.getState().setConfig({ mode: "time", seconds: 30 });
  store.getState().applyEvent({ type: "start", at: performance.timeOrigin + performance.now() });
  store.getState().restart();
  const restartedAt = store.getState().readAt;

  await Bun.sleep(250);

  expect(store.getState().readAt).toBe(restartedAt);
});

test("the instant the Live stats are read at stops moving once the config of a running Game changes", async () => {
  store.getState().setConfig({ mode: "time", seconds: 30 });
  store.getState().applyEvent({ type: "start", at: performance.timeOrigin + performance.now() });
  store.getState().setConfig({ mode: "time", seconds: 60 });
  const reconfiguredAt = store.getState().readAt;

  await Bun.sleep(250);

  expect(store.getState().readAt).toBe(reconfiguredAt);
});

test("a refresh behind the instant the Live stats are read at does not move it back", async () => {
  const start = performance.timeOrigin + performance.now();
  store.getState().setConfig({ mode: "time", seconds: 30 });
  store.getState().applyEvent({ type: "start", at: start });
  // An Event stamped ahead of this client's clock, as one on a shifted Game clock can be.
  store.getState().applyEvent({ type: "insert", at: start + 10_000, text: "a" });

  await Bun.sleep(250);

  expect(store.getState().readAt).toBe(start + 10_000);
});

test("the instant the Live stats are read at stops moving once the Game is finished", async () => {
  store.getState().loadGame({ mode: "words", wordCount: 1 }, ["a"]);
  const start = performance.timeOrigin + performance.now();
  store.getState().applyEvent({ type: "start", at: start });
  store.getState().applyEvent({ type: "insert", at: start + 50, text: "a" });
  expect(store.getState().game.status).toBe("finished");
  const finishedAt = store.getState().readAt;

  await Bun.sleep(250);

  expect(store.getState().readAt).toBe(finishedAt);
});

test("the Keystroke that finishes a words Game moves the instant the Live stats are read at to its end", () => {
  store.getState().loadGame({ mode: "words", wordCount: 1 }, ["a"]);
  const start = performance.timeOrigin + performance.now();
  store.getState().applyEvent({ type: "start", at: start });

  store.getState().applyEvent({ type: "insert", at: start + 50, text: "a" });

  const { game, readAt } = store.getState();
  expect(game.status).toBe("finished");
  expect(readAt).toBe(start + 50);
});

test("an Event older than the instant the Live stats are read at does not move it back", async () => {
  const start = performance.timeOrigin + performance.now();
  store.getState().setConfig({ mode: "time", seconds: 30 });
  store.getState().applyEvent({ type: "start", at: start });
  await Bun.sleep(250);
  const readAt = store.getState().readAt;

  store.getState().applyEvent({ type: "insert", at: start + 10, text: "a" });

  expect(store.getState().readAt).toBeGreaterThanOrEqual(readAt);
});

test("restarting keeps the Game's config", () => {
  store.getState().setConfig({ mode: "words", wordCount: 25 });

  store.getState().restart();

  expect(store.getState().game.config).toEqual({ mode: "words", wordCount: 25 });
  expect(store.getState().game.targetWords).toHaveLength(25);
});

test("changing the config starts a new ready Game with it", () => {
  typeActiveWord();

  store.getState().setConfig({ mode: "time", seconds: 60 });

  const { game } = store.getState();
  expect(game.status).toBe("ready");
  expect(game.config).toEqual({ mode: "time", seconds: 60 });
  expect(game.inputs.every((input) => input === "")).toBe(true);
});
