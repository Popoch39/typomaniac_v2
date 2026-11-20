import { keyPressBars } from "../replay/keyPressBars.ts";
import { isPlaying, playbackPosition, REPLAY_SPEEDS } from "../replay/replayPlayback.ts";
import { frameAt, replayTimeline } from "../replay/replayTimeline.ts";
import { replayedWords } from "../replay/replayedWords.ts";
import { useReplayStore } from "../store/useReplayStore.ts";
import { useFrameTime } from "./useFrameTime.ts";
import type { ReviewedGame } from "./useReview.ts";

// About three lines of words, as a live Game shows.
const SHOWN_WORDS = 24;
// The KeyPresses of the last two seconds: long enough to see a hold, short enough to tell keys apart.
const KEY_PRESS_WINDOW_MS = 2000;

const seconds = (milliseconds: number) => `${(milliseconds / 1000).toFixed(1)} s`;

// What is printed on a key: its letter or digit rather than its code.
const keyLabel = (code: string) =>
  code === "Space" ? "␣" : code.replace(/^(Key|Digit|Numpad)/, "");

export function useGameReplay({ words, journal, result }: ReviewedGame) {
  const timeline = replayTimeline(words, journal);
  const playback = useReplayStore((state) => state.playback);
  const togglePause = useReplayStore((state) => state.togglePause);
  const restart = useReplayStore((state) => state.restart);
  const slow = useReplayStore((state) => state.slow);
  const now = useFrameTime(playback.playingSince !== null);
  const { duration } = timeline;
  const position = playbackPosition(playback, now, duration);
  const playing = isPlaying(playback, now, duration);

  return {
    isPlaying: playing,
    clock: `${seconds(position)} / ${seconds(duration)}`,
    words: replayedWords(frameAt(timeline, position), SHOWN_WORDS),
    keyPresses: keyPressBars(timeline, position, KEY_PRESS_WINDOW_MS).map((bar) => ({
      ...bar,
      label: keyLabel(bar.code),
    })),
    // The replay ends on the Result the server saved, not on one computed again here.
    end:
      position >= duration
        ? `${result.wpm} WPM · ${result.rawWpm} raw · ${result.accuracy}% accuracy · ${result.consistency}% consistency`
        : "",
    speeds: REPLAY_SPEEDS.map((speed) => ({
      speed,
      label: `${speed}×`,
      isChosen: playback.speed === speed,
      choose: () => slow(speed, duration),
    })),
    togglePause: () => togglePause(duration),
    restart,
  };
}
