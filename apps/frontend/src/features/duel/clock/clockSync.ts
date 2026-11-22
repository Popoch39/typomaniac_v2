import { type ClockSample, estimateClockOffset } from "./estimateClockOffset.ts";

/** Where the ping/pong exchanges that estimate the server's clock offset stand. */
export type ClockSync =
  | { readonly kind: "unsynced" }
  | {
      readonly kind: "sampling";
      readonly samples: readonly ClockSample[];
      // The offset a sync before this one estimated, still used until this one ends.
      readonly previousOffset: number | null;
      // The ping whose pong is awaited, named by the instant it was sent, which its pong echoes: a
      // pong to any other ping, as one from an earlier sync, would add a second chain of exchanges.
      readonly awaitedClientAt: number;
      readonly lostPongs: number;
    }
  | { readonly kind: "synced"; readonly offset: number };

/** `at` is the instant the event happened on this client's clock. */
export type ClockSyncEvent =
  | { readonly kind: "synchronise"; readonly at: number }
  | {
      readonly kind: "pong";
      readonly clientAt: number;
      readonly serverAt: number;
      readonly at: number;
    }
  | { readonly kind: "pongLost"; readonly clientAt: number; readonly at: number }
  | { readonly kind: "stop" }
  | { readonly kind: "reset" };

/** `ping` sends a ping stamped `clientAt` and waits for its pong; `drop` reopens the socket. */
export type ClockSyncEffect =
  | { readonly kind: "ping"; readonly clientAt: number }
  | { readonly kind: "drop" };

// A few exchanges, so that one slow round trip does not skew the Start.
const CLOCK_SAMPLE_COUNT = 5;
// Pongs lost in a row past which the socket itself is taken for broken, which shows the Participant
// it is reconnecting rather than a Countdown that never starts.
const MAX_LOST_PONGS = 3;

/** How far the server's clock is ahead of this client's, `null` until a sync has ended. */
export function clockOffsetOf(sync: ClockSync) {
  if (sync.kind === "synced") return sync.offset;
  if (sync.kind === "sampling") return sync.previousOffset;
  return null;
}

// Stopped exchanges keep the offset already estimated.
function stopped(sync: ClockSync): ClockSync {
  const offset = clockOffsetOf(sync);
  return offset === null ? { kind: "unsynced" } : { kind: "synced", offset };
}

export function nextClockSync(
  sync: ClockSync,
  event: ClockSyncEvent,
): { readonly sync: ClockSync; readonly effects: readonly ClockSyncEffect[] } {
  switch (event.kind) {
    case "synchronise":
      return {
        sync: {
          kind: "sampling",
          samples: [],
          previousOffset: clockOffsetOf(sync),
          awaitedClientAt: event.at,
          lostPongs: 0,
        },
        effects: [{ kind: "ping", clientAt: event.at }],
      };
    case "pong": {
      if (sync.kind !== "sampling" || event.clientAt !== sync.awaitedClientAt)
        return { sync, effects: [] };
      const samples = [
        ...sync.samples,
        { sentAt: event.clientAt, serverAt: event.serverAt, receivedAt: event.at },
      ];
      const offset = estimateClockOffset(samples);
      if (samples.length >= CLOCK_SAMPLE_COUNT && offset !== null)
        return { sync: { kind: "synced", offset }, effects: [] };
      return {
        sync: { ...sync, samples, awaitedClientAt: event.at, lostPongs: 0 },
        effects: [{ kind: "ping", clientAt: event.at }],
      };
    }
    case "pongLost": {
      if (sync.kind !== "sampling" || event.clientAt !== sync.awaitedClientAt)
        return { sync, effects: [] };
      const lostPongs = sync.lostPongs + 1;
      if (lostPongs >= MAX_LOST_PONGS) return { sync: stopped(sync), effects: [{ kind: "drop" }] };
      // A lost pong would stall the exchanges, and with them the Countdown, for good.
      return {
        sync: { ...sync, awaitedClientAt: event.at, lostPongs },
        effects: [{ kind: "ping", clientAt: event.at }],
      };
    }
    case "stop":
      return { sync: stopped(sync), effects: [] };
    case "reset":
      return { sync: { kind: "unsynced" }, effects: [] };
  }
}
