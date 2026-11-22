import type { ClientMessage } from "@repo/duel-engine";
import { create } from "zustand";
import { clientTime } from "../../game/clock/clientTime.ts";
import { type ClockSample, estimateClockOffset } from "../clock/estimateClockOffset.ts";

/** The socket the ping/pong exchanges run on. */
export type ClockLink = {
  readonly send: (message: ClientMessage) => void;
  /** Drops the socket, so that it is reopened: the server answers no ping on it any more. */
  readonly drop: () => void;
};

type DuelClockState = {
  /** How far the server's clock is ahead of this client's, `null` until the ping/pong exchanges end. */
  readonly clockOffset: number | null;
  /** Runs the ping/pong exchanges again on `link`, as on each seating in the Duel. */
  readonly synchronise: (link: ClockLink) => void;
  /** Stops the exchanges under way, as their socket dropped, keeping the offset already estimated. */
  readonly stop: () => void;
  readonly receivePong: (pong: { readonly clientAt: number; readonly serverAt: number }) => void;
  readonly reset: () => void;
};

// A few exchanges, so that one slow round trip does not skew the Start.
const CLOCK_SAMPLE_COUNT = 5;
// Well above any round trip the clock can use, so that only a lost pong is waited for this long.
const PONG_TIMEOUT_MS = 1000;
// Pongs lost in a row past which the socket itself is taken for broken, which shows the Participant
// it is reconnecting rather than a Countdown that never starts.
const MAX_LOST_PONGS = 3;

let samples: ClockSample[] = [];
let link: ClockLink | null = null;
let pongTimer: ReturnType<typeof setTimeout> | null = null;
// The ping whose pong is awaited, named by the instant it was sent, which its pong echoes: a pong
// to any other ping, as one from an earlier sync, would add a second chain of exchanges.
let awaitedClientAt: number | null = null;
let lostPongs = 0;

function stopWaiting() {
  if (pongTimer !== null) clearTimeout(pongTimer);
  pongTimer = null;
  awaitedClientAt = null;
}

function ping() {
  if (link === null) return;
  stopWaiting();
  const clientAt = clientTime();
  awaitedClientAt = clientAt;
  link.send({ type: "ping", clientAt });
  // A lost pong would stall the exchanges, and with them the Countdown, for good.
  pongTimer = setTimeout(() => {
    lostPongs += 1;
    if (lostPongs < MAX_LOST_PONGS) return ping();
    const brokenLink = link;
    stopExchanges();
    brokenLink?.drop();
  }, PONG_TIMEOUT_MS);
}

function stopExchanges() {
  stopWaiting();
  samples = [];
  lostPongs = 0;
  link = null;
}

export const useDuelClockStore = create<DuelClockState>()((set) => ({
  clockOffset: null,
  synchronise: (synchronisedLink) => {
    stopExchanges();
    link = synchronisedLink;
    ping();
  },
  stop: stopExchanges,
  receivePong: ({ clientAt, serverAt }) => {
    if (clientAt !== awaitedClientAt) return;
    samples.push({ sentAt: clientAt, serverAt, receivedAt: clientTime() });
    stopWaiting();
    lostPongs = 0;
    if (samples.length < CLOCK_SAMPLE_COUNT) return ping();
    set({ clockOffset: estimateClockOffset(samples) });
  },
  reset: () => {
    stopExchanges();
    set({ clockOffset: null });
  },
}));
