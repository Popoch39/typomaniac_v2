import { create } from "zustand";
import { eventTime } from "../../game/clock/eventTime.ts";
import { type ClockSample, estimateClockOffset } from "../clock/estimateClockOffset.ts";
import { sendToDuel } from "../socket/duelSocket.ts";

type DuelClockState = {
  /** How far the server's clock is ahead of this client's, `null` until the ping/pong exchanges end. */
  readonly clockOffset: number | null;
  /** Runs the ping/pong exchanges again, as on each seating in the Duel. */
  readonly synchronise: () => void;
  readonly receivePong: (pong: { readonly clientAt: number; readonly serverAt: number }) => void;
  readonly reset: () => void;
};

// A few exchanges, so that one slow round trip does not skew the Start.
const CLOCK_SAMPLE_COUNT = 5;

let samples: ClockSample[] = [];

function ping() {
  sendToDuel({ type: "ping", clientAt: eventTime() });
}

export const useDuelClockStore = create<DuelClockState>()((set) => ({
  clockOffset: null,
  synchronise: () => {
    samples = [];
    ping();
  },
  receivePong: ({ clientAt, serverAt }) => {
    samples.push({ sentAt: clientAt, serverAt, receivedAt: eventTime() });
    if (samples.length < CLOCK_SAMPLE_COUNT) return ping();
    set({ clockOffset: estimateClockOffset(samples) });
  },
  reset: () => {
    samples = [];
    set({ clockOffset: null });
  },
}));
