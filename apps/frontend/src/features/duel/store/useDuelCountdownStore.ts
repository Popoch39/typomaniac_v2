import { create } from "zustand";
import { clientTime } from "../../game/clock/clientTime.ts";
import { useDuelClockStore } from "./useDuelClockStore.ts";

type DuelCountdownState = {
  /** Whole seconds left before the Start, shown during the Countdown. */
  readonly secondsLeft: number | null;
  /** Runs `start` at the announced Start, given in server time, once the clock offset is known. */
  readonly schedule: (startAt: number, start: () => void) => void;
  readonly cancel: () => void;
};

const COUNTDOWN_REFRESH_MS = 100;

// Owned by the store because components may not run effects; one Countdown runs at a time.
let startTimer: ReturnType<typeof setTimeout> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let stopFollowingClock: (() => void) | null = null;

function stopTimers() {
  if (startTimer !== null) clearTimeout(startTimer);
  if (refreshTimer !== null) clearInterval(refreshTimer);
  startTimer = null;
  refreshTimer = null;
}

export const useDuelCountdownStore = create<DuelCountdownState>()((set) => {
  const cancel = () => {
    stopTimers();
    stopFollowingClock?.();
    stopFollowingClock = null;
    set({ secondsLeft: null });
  };

  return {
    secondsLeft: null,
    schedule: (startAt, start) => {
      cancel();
      const runFrom = (clockOffset: number | null) => {
        if (clockOffset === null) return;
        stopTimers();
        // The announced instant, on this client's clock.
        const localStartAt = startAt - clockOffset;
        const refreshSecondsLeft = () =>
          set({ secondsLeft: Math.max(0, Math.ceil((localStartAt - clientTime()) / 1000)) });
        refreshSecondsLeft();
        refreshTimer = setInterval(refreshSecondsLeft, COUNTDOWN_REFRESH_MS);
        startTimer = setTimeout(() => {
          cancel();
          start();
        }, localStartAt - clientTime());
      };
      runFrom(useDuelClockStore.getState().clockOffset);
      // Waits for the clock offset when it comes last, and follows a newer estimate of it.
      stopFollowingClock = useDuelClockStore.subscribe(({ clockOffset }, previous) => {
        if (clockOffset !== previous.clockOffset) runFrom(clockOffset);
      });
    },
    cancel,
  };
});
