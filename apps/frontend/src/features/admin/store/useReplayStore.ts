import { create } from "zustand";
import {
  CLOSED_PLAYBACK,
  next,
  playbackEndsIn,
  type ReplayEvent,
  type ReplayPlayback,
} from "../replay/replayPlayback.ts";

type ReplayState = {
  readonly playback: ReplayPlayback;
  /** Plays a Game from its start, at its real rhythm, closing the one being replayed. */
  readonly open: (replayed: string, duration: number) => void;
  readonly close: () => void;
  /** Pauses a replay that plays, plays one that is paused or ended. */
  readonly togglePause: () => void;
  readonly restart: () => void;
  readonly slow: (speed: number) => void;
};

// Instants of the page, on the clock animation frames are timed with.
const now = () => performance.now();

let endTimer: ReturnType<typeof setTimeout> | undefined;

export const useReplayStore = create<ReplayState>()((set, get) => {
  const apply = (event: ReplayEvent) => {
    const playback = next(get().playback, event);
    set({ playback });
    clearTimeout(endTimer);
    const endsIn = playbackEndsIn(playback, now());
    if (endsIn !== null) endTimer = setTimeout(() => apply({ kind: "reachEnd" }), endsIn);
  };

  return {
    playback: CLOSED_PLAYBACK,
    open: (replayed, duration) => apply({ kind: "open", replayed, duration, at: now() }),
    close: () => apply({ kind: "close" }),
    togglePause: () => apply({ kind: "togglePause", at: now() }),
    restart: () => apply({ kind: "restart", at: now() }),
    slow: (speed) => apply({ kind: "slow", speed, at: now() }),
  };
});
