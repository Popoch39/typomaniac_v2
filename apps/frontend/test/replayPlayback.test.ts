import { expect, test } from "bun:test";
import {
  CLOSED_PLAYBACK,
  nextReplayPlayback,
  playbackEndsIn,
  playbackPosition,
  type ReplayPlayback,
} from "../src/features/admin/replay/replayPlayback.ts";

const DURATION = 30_000;

// The playback a transition moves to, its effects read by their own test.
const next = (...[playback, event]: Parameters<typeof nextReplayPlayback>) =>
  nextReplayPlayback(playback, event).playback;

const opened = (at: number) =>
  next(CLOSED_PLAYBACK, { kind: "open", replayed: "duel/1", duration: DURATION, at });

test("a replay plays the journal at its real rhythm from its start", () => {
  const playback = opened(1000);

  expect(playback.kind).toBe("playing");
  expect(playbackPosition(playback, 1000)).toBe(0);
  expect(playbackPosition(playback, 3500)).toBe(2500);
});

test("a replay that plays shows the end of the journal once past it, and reaches it then", () => {
  const playback = opened(0);

  expect(playbackPosition(playback, 40_000)).toBe(DURATION);
  expect(playbackEndsIn(playback, 10_000)).toBe(20_000);
  const ended = next(playback, { kind: "reachEnd" });
  expect(ended.kind).toBe("ended");
  expect(playbackPosition(ended, 50_000)).toBe(DURATION);
  expect(playbackEndsIn(ended, 50_000)).toBeNull();
});

test("a paused replay stays where it was paused, and resumes from there", () => {
  const paused = next(opened(0), { kind: "togglePause", at: 2000 });

  expect(paused.kind).toBe("paused");
  expect(playbackPosition(paused, 9000)).toBe(2000);
  expect(playbackEndsIn(paused, 9000)).toBeNull();
  const resumed = next(paused, { kind: "togglePause", at: 9000 });
  expect(playbackPosition(resumed, 10_000)).toBe(3000);
});

test("resuming a replay that reached the end plays it again from the start", () => {
  const ended = next(opened(0), { kind: "reachEnd" });

  expect(playbackPosition(next(ended, { kind: "togglePause", at: 50_000 }), 51_000)).toBe(1000);
});

test("a restarted replay plays again from the start", () => {
  const restarted = next(opened(0), { kind: "restart", at: 5000 });

  expect(restarted.kind).toBe("playing");
  expect(playbackPosition(restarted, 6000)).toBe(1000);
});

test("a slowed replay goes on from where it is at the chosen share of the real rhythm", () => {
  const slowed = next(opened(0), { kind: "slow", speed: 0.25, at: 4000 });

  expect(playbackPosition(slowed, 4000)).toBe(4000);
  expect(playbackPosition(slowed, 8000)).toBe(5000);
  expect(playbackEndsIn(slowed, 8000)).toBe(100_000);
});

test("a paused replay keeps the speed chosen meanwhile, and a restart keeps it too", () => {
  const paused = next(opened(0), { kind: "togglePause", at: 2000 });
  const slowed = next(paused, { kind: "slow", speed: 0.5, at: 3000 });

  expect(playbackPosition(slowed, 5000)).toBe(2000);
  expect(playbackPosition(next(slowed, { kind: "togglePause", at: 5000 }), 7000)).toBe(3000);
  expect(playbackPosition(next(slowed, { kind: "restart", at: 10_000 }), 12_000)).toBe(1000);
});

test("closing a replay forgets where it stood, and opening another plays it from its start", () => {
  const paused = next(opened(0), { kind: "togglePause", at: 2000 });
  const closed = next(paused, { kind: "close" });

  expect(closed.kind).toBe("closed");
  const reopened = next(closed, { kind: "open", replayed: "duel/2", duration: DURATION, at: 9000 });
  expect(reopened).toEqual({
    kind: "playing",
    replayed: "duel/2",
    duration: DURATION,
    speed: 1,
    from: 0,
    since: 9000,
  } satisfies ReplayPlayback);
});

test("a closed replay ignores the controls", () => {
  expect(next(CLOSED_PLAYBACK, { kind: "togglePause", at: 0 })).toBe(CLOSED_PLAYBACK);
  expect(next(CLOSED_PLAYBACK, { kind: "restart", at: 0 })).toBe(CLOSED_PLAYBACK);
  expect(next(CLOSED_PLAYBACK, { kind: "reachEnd" })).toBe(CLOSED_PLAYBACK);
});

test("a replay that plays arms its end at the end of its journal, and one that stops playing disarms it", () => {
  const open = { kind: "open", replayed: "duel/1", duration: DURATION, at: 1000 } as const;
  const playing = nextReplayPlayback(CLOSED_PLAYBACK, open);
  expect(playing.effects).toEqual([{ kind: "endIn", ms: DURATION }]);

  const paused = nextReplayPlayback(playing.playback, { kind: "togglePause", at: 11_000 });
  expect(paused.effects).toEqual([{ kind: "cancelEnd" }]);

  const slowed = nextReplayPlayback(
    nextReplayPlayback(paused.playback, { kind: "togglePause", at: 20_000 }).playback,
    { kind: "slow", speed: 0.5, at: 20_000 },
  );
  expect(slowed.effects).toEqual([{ kind: "endIn", ms: 40_000 }]);

  expect(nextReplayPlayback(slowed.playback, { kind: "close" }).effects).toEqual([
    { kind: "cancelEnd" },
  ]);
});
