import { afterEach, expect, test } from "bun:test";
import { useReplayStore } from "../src/features/admin/store/useReplayStore.ts";

const store = useReplayStore;

// A replay that plays ends on a timer: closing it stops the timer so no test leaves one running.
afterEach(() => store.getState().close());

test("a replay that reaches its end is no longer playing", async () => {
  store.getState().open("duel/1", 30);

  await Bun.sleep(80);

  expect(store.getState().playback.kind).toBe("ended");
});

test("opening a replay after closing another starts at the beginning", async () => {
  store.getState().open("duel/1", 30_000);
  await Bun.sleep(40);
  store.getState().togglePause();
  store.getState().close();

  store.getState().open("duel/2", 30_000);

  const { playback } = store.getState();
  expect(playback).toMatchObject({ kind: "playing", replayed: "duel/2", from: 0, speed: 1 });
});

test("a closed replay is no longer playing and never ends", async () => {
  store.getState().open("duel/1", 30);
  store.getState().close();

  await Bun.sleep(80);

  expect(store.getState().playback.kind).toBe("closed");
});

test("a paused replay does not reach its end, and plays on to it once resumed", async () => {
  store.getState().open("duel/1", 30);
  store.getState().togglePause();
  await Bun.sleep(80);
  expect(store.getState().playback.kind).toBe("paused");

  store.getState().togglePause();
  await Bun.sleep(80);

  expect(store.getState().playback.kind).toBe("ended");
});

test("an ended replay plays again from the start", async () => {
  store.getState().open("duel/1", 30);
  await Bun.sleep(80);

  store.getState().togglePause();

  expect(store.getState().playback).toMatchObject({ kind: "playing", from: 0 });
});
