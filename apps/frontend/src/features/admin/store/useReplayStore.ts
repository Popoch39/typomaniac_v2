import { create } from "zustand";
import {
  isPlaying,
  pausePlayback,
  type ReplayPlayback,
  restartPlayback,
  resumePlayback,
  slowPlayback,
  startPlayback,
} from "../replay/replayPlayback.ts";

type ReplayState = {
  /** The Game being replayed, as `<duelId>/<round>`, null while none is: one at a time. */
  readonly replayed: string | null;
  readonly playback: ReplayPlayback;
  /** Plays a Game from its start, at its real rhythm, closing the one being replayed. */
  readonly open: (replayed: string) => void;
  readonly close: () => void;
  /** Pauses a replay that plays, plays one that is paused or ended; `duration` is its journal's. */
  readonly togglePause: (duration: number) => void;
  readonly restart: () => void;
  readonly slow: (speed: number, duration: number) => void;
};

// Instants of the page, on the clock animation frames are timed with.
const now = () => performance.now();

export const useReplayStore = create<ReplayState>()((set, get) => ({
  replayed: null,
  playback: startPlayback(0),
  open: (replayed) => set({ replayed, playback: startPlayback(now()) }),
  close: () => set({ replayed: null }),
  togglePause: (duration) => {
    const { playback } = get();
    const at = now();
    set({
      playback: isPlaying(playback, at, duration)
        ? pausePlayback(playback, at, duration)
        : resumePlayback(playback, at, duration),
    });
  },
  restart: () => set({ playback: restartPlayback(get().playback, now()) }),
  slow: (speed, duration) =>
    set({ playback: slowPlayback(get().playback, speed, now(), duration) }),
}));
