import { expect, test } from "bun:test";
import {
  isPlaying,
  pausePlayback,
  playbackPosition,
  restartPlayback,
  resumePlayback,
  slowPlayback,
  startPlayback,
} from "../src/features/admin/replay/replayPlayback.ts";

const DURATION = 30_000;

test("a replay plays the journal at its real rhythm from its start", () => {
  const playback = startPlayback(1000);

  expect(playbackPosition(playback, 1000, DURATION)).toBe(0);
  expect(playbackPosition(playback, 3500, DURATION)).toBe(2500);
  expect(isPlaying(playback, 3500, DURATION)).toBe(true);
});

test("a replay stops on the end of the journal", () => {
  const playback = startPlayback(0);

  expect(playbackPosition(playback, 40_000, DURATION)).toBe(DURATION);
  expect(isPlaying(playback, 40_000, DURATION)).toBe(false);
});

test("a paused replay stays where it was paused, and resumes from there", () => {
  const paused = pausePlayback(startPlayback(0), 2000, DURATION);

  expect(playbackPosition(paused, 9000, DURATION)).toBe(2000);
  expect(isPlaying(paused, 9000, DURATION)).toBe(false);
  const resumed = resumePlayback(paused, 9000, DURATION);
  expect(playbackPosition(resumed, 10_000, DURATION)).toBe(3000);
});

test("resuming a replay that reached the end plays it again from the start", () => {
  const ended = pausePlayback(startPlayback(0), 40_000, DURATION);

  expect(playbackPosition(resumePlayback(ended, 50_000, DURATION), 51_000, DURATION)).toBe(1000);
});

test("a restarted replay plays again from the start", () => {
  const restarted = restartPlayback(startPlayback(0), 5000);

  expect(playbackPosition(restarted, 6000, DURATION)).toBe(1000);
  expect(isPlaying(restarted, 6000, DURATION)).toBe(true);
});

test("a slowed replay goes on from where it is at the chosen share of the real rhythm", () => {
  const slowed = slowPlayback(startPlayback(0), 0.25, 4000, DURATION);

  expect(playbackPosition(slowed, 4000, DURATION)).toBe(4000);
  expect(playbackPosition(slowed, 8000, DURATION)).toBe(5000);
});

test("a paused replay keeps the speed chosen meanwhile, and a restart keeps it too", () => {
  const paused = pausePlayback(startPlayback(0), 2000, DURATION);
  const slowed = slowPlayback(paused, 0.5, 3000, DURATION);

  expect(playbackPosition(slowed, 5000, DURATION)).toBe(2000);
  expect(playbackPosition(resumePlayback(slowed, 5000, DURATION), 7000, DURATION)).toBe(3000);
  expect(playbackPosition(restartPlayback(slowed, 10_000), 12_000, DURATION)).toBe(1000);
});
