import { create } from "zustand";
import { clientTime } from "../../game/clock/clientTime.ts";
import { type Countdown, type CountdownEvent, nextCountdown } from "../clock/countdown.ts";
import { useDuelClockStore } from "./useDuelClockStore.ts";

type DuelCountdownState = {
  readonly countdown: Countdown;
  /** Runs `start` at the announced Start, given in server time, once the clock offset is known. */
  readonly schedule: (startAt: number, start: () => void) => void;
  /** Counts down to the announced Start of the next Round, starting nothing at its end. */
  readonly display: (startAt: number) => void;
  readonly cancel: () => void;
};

const COUNTDOWN_REFRESH_MS = 100;

// Owned by the store because components may not run effects; one Countdown runs at a time.
let startTimer: ReturnType<typeof setTimeout> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let stopFollowingClock: (() => void) | null = null;
let startRound: () => void = () => undefined;

function stopTimers() {
  if (startTimer !== null) clearTimeout(startTimer);
  if (refreshTimer !== null) clearInterval(refreshTimer);
  startTimer = null;
  refreshTimer = null;
}

export const useDuelCountdownStore = create<DuelCountdownState>()((set, get) => {
  const dispatch = (event: CountdownEvent) => {
    const previous = get().countdown;
    const { countdown, effect } = nextCountdown(previous, event);
    set({ countdown });
    if (countdown.kind === "idle") {
      stopTimers();
      stopFollowingClock?.();
      stopFollowingClock = null;
    } else if (
      countdown.kind === "counting" &&
      (previous.kind !== "counting" || previous.localStartAt !== countdown.localStartAt)
    ) {
      stopTimers();
      const { localStartAt } = countdown;
      refreshTimer = setInterval(
        () => dispatch({ kind: "tick", at: clientTime() }),
        COUNTDOWN_REFRESH_MS,
      );
      startTimer = setTimeout(
        () => dispatch({ kind: "due", localStartAt }),
        localStartAt - clientTime(),
      );
    }
    if (effect === "start") startRound();
  };

  const begin = (startAt: number, purpose: "start" | "display", start: () => void) => {
    dispatch({ kind: "cancel" });
    startRound = start;
    dispatch({
      kind: "schedule",
      startAt,
      purpose,
      clockOffset: useDuelClockStore.getState().clockOffset,
      at: clientTime(),
    });
    stopFollowingClock = useDuelClockStore.subscribe(({ clockOffset }, { clockOffset: before }) => {
      if (clockOffset !== before) dispatch({ kind: "clockOffset", clockOffset, at: clientTime() });
    });
  };

  return {
    countdown: { kind: "idle" },
    schedule: (startAt, start) => begin(startAt, "start", start),
    display: (startAt) => begin(startAt, "display", () => undefined),
    cancel: () => dispatch({ kind: "cancel" }),
  };
});
