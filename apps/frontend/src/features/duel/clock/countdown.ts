/** `start` starts the Round at its end; `display` only shows the time left until the next Round's. */
export type CountdownPurpose = "start" | "display";

/** The Countdown to an announced Start, given in server time. */
export type Countdown =
  | { readonly kind: "idle" }
  // The Start is announced but the clock offset that places it on this client's clock is not known yet.
  | {
      readonly kind: "awaitingOffset";
      readonly startAt: number;
      readonly purpose: CountdownPurpose;
    }
  | {
      readonly kind: "counting";
      // Kept to place the Start again when a newer estimate of the clock offset comes.
      readonly startAt: number;
      readonly localStartAt: number;
      readonly secondsLeft: number;
      readonly purpose: CountdownPurpose;
    };

/** `at` is the instant the event happened on this client's clock. */
export type CountdownEvent =
  | {
      readonly kind: "schedule";
      readonly startAt: number;
      readonly purpose: CountdownPurpose;
      readonly clockOffset: number | null;
      readonly at: number;
    }
  | { readonly kind: "clockOffset"; readonly clockOffset: number | null; readonly at: number }
  | { readonly kind: "tick"; readonly at: number }
  // The timer armed for `localStartAt` fired.
  | { readonly kind: "due"; readonly localStartAt: number }
  | { readonly kind: "cancel" };

/**
 * `arm` refreshes the Countdown and fires `due` at `localStartAt`, in place of any timer armed
 * before; `disarm` stops the timers and the following of the clock; `start` starts the Round.
 */
export type CountdownEffect =
  | { readonly kind: "arm"; readonly localStartAt: number }
  | { readonly kind: "disarm" }
  | { readonly kind: "start" };

type CountdownStep = { readonly countdown: Countdown; readonly starts: boolean };

function counting(
  startAt: number,
  purpose: CountdownPurpose,
  clockOffset: number,
  at: number,
): Countdown {
  // The announced instant, on this client's clock.
  const localStartAt = startAt - clockOffset;
  const secondsLeft = Math.max(0, Math.ceil((localStartAt - at) / 1000));
  return { kind: "counting", startAt, localStartAt, secondsLeft, purpose };
}

function step(countdown: Countdown, event: CountdownEvent): CountdownStep {
  switch (event.kind) {
    case "schedule": {
      const { startAt, purpose, clockOffset, at } = event;
      if (clockOffset === null)
        return { countdown: { kind: "awaitingOffset", startAt, purpose }, starts: false };
      return { countdown: counting(startAt, purpose, clockOffset, at), starts: false };
    }
    case "clockOffset":
      // Waits for the clock offset when it comes last, and follows a newer estimate of it.
      if (countdown.kind === "idle" || event.clockOffset === null)
        return { countdown, starts: false };
      return {
        countdown: counting(countdown.startAt, countdown.purpose, event.clockOffset, event.at),
        starts: false,
      };
    case "tick": {
      if (countdown.kind !== "counting") return { countdown, starts: false };
      const refreshed = counting(
        countdown.startAt,
        countdown.purpose,
        countdown.startAt - countdown.localStartAt,
        event.at,
      );
      // The same second keeps the same state, so that what shows it is not drawn again.
      return {
        countdown:
          refreshed.kind === "counting" && refreshed.secondsLeft === countdown.secondsLeft
            ? countdown
            : refreshed,
        starts: false,
      };
    }
    case "due":
      if (countdown.kind !== "counting" || countdown.localStartAt !== event.localStartAt)
        return { countdown, starts: false };
      return {
        countdown: { kind: "idle" },
        starts: countdown.purpose === "start",
      };
    case "cancel":
      return { countdown: { kind: "idle" }, starts: false };
  }
}

export function nextCountdown(
  countdown: Countdown,
  event: CountdownEvent,
): { readonly countdown: Countdown; readonly effects: readonly CountdownEffect[] } {
  const { countdown: next, starts } = step(countdown, event);
  const effects: CountdownEffect[] = [];
  if (next.kind === "idle") effects.push({ kind: "disarm" });
  // A new Start on this client's clock, first placed or moved by a newer clock offset.
  else if (
    next.kind === "counting" &&
    (countdown.kind !== "counting" || countdown.localStartAt !== next.localStartAt)
  )
    effects.push({ kind: "arm", localStartAt: next.localStartAt });
  if (starts) effects.push({ kind: "start" });
  return { countdown: next, effects };
}
