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

/** `start` starts the Round. */
export type CountdownEffect = "start" | null;

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

export function nextCountdown(
  countdown: Countdown,
  event: CountdownEvent,
): { readonly countdown: Countdown; readonly effect: CountdownEffect } {
  switch (event.kind) {
    case "schedule": {
      const { startAt, purpose, clockOffset, at } = event;
      if (clockOffset === null)
        return { countdown: { kind: "awaitingOffset", startAt, purpose }, effect: null };
      return { countdown: counting(startAt, purpose, clockOffset, at), effect: null };
    }
    case "clockOffset":
      // Waits for the clock offset when it comes last, and follows a newer estimate of it.
      if (countdown.kind === "idle" || event.clockOffset === null)
        return { countdown, effect: null };
      return {
        countdown: counting(countdown.startAt, countdown.purpose, event.clockOffset, event.at),
        effect: null,
      };
    case "tick": {
      if (countdown.kind !== "counting") return { countdown, effect: null };
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
        effect: null,
      };
    }
    case "due":
      if (countdown.kind !== "counting" || countdown.localStartAt !== event.localStartAt)
        return { countdown, effect: null };
      return {
        countdown: { kind: "idle" },
        effect: countdown.purpose === "start" ? "start" : null,
      };
    case "cancel":
      return { countdown: { kind: "idle" }, effect: null };
  }
}
