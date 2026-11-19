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
