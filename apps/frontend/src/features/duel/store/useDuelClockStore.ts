import type { ClientMessage } from "@repo/duel-engine";
import { create } from "zustand";
import { clientTime } from "../../game/clock/clientTime.ts";
import {
  type ClockSync,
  type ClockSyncEvent,
  clockOffsetOf,
  nextClockSync,
} from "../clock/clockSync.ts";

/** The socket the ping/pong exchanges run on. */
export type ClockLink = {
  readonly send: (message: ClientMessage) => void;
  /** Drops the socket, so that it is reopened: the server answers no ping on it any more. */
  readonly drop: () => void;
};

type DuelClockState = {
  readonly sync: ClockSync;
  /** How far the server's clock is ahead of this client's, `null` until the ping/pong exchanges end. */
  readonly clockOffset: number | null;
  /** Runs the ping/pong exchanges again on `link`, as on each seating in the Duel. */
  readonly synchronise: (link: ClockLink) => void;
  /** Stops the exchanges under way, as their socket dropped, keeping the offset already estimated. */
  readonly stop: () => void;
  readonly receivePong: (pong: { readonly clientAt: number; readonly serverAt: number }) => void;
  readonly reset: () => void;
};

// Well above any round trip the clock can use, so that only a lost pong is waited for this long.
const PONG_TIMEOUT_MS = 1000;

// The exchanges run on one socket at a time, owned by the store because components may not run effects.
let link: ClockLink | null = null;
let pongTimer: ReturnType<typeof setTimeout> | null = null;

function stopWaiting() {
  if (pongTimer !== null) clearTimeout(pongTimer);
  pongTimer = null;
}

export const useDuelClockStore = create<DuelClockState>()((set, get) => {
  const dispatch = (event: ClockSyncEvent) => {
    const { sync, effects } = nextClockSync(get().sync, event);
    stopWaiting();
    set({ sync, clockOffset: clockOffsetOf(sync) });
    const current = link;
    if (sync.kind !== "sampling") link = null;
    for (const effect of effects) {
      if (effect.kind === "drop") {
        current?.drop();
        continue;
      }
      const { clientAt } = effect;
      // Armed before the send, so that a pong answered at once clears it.
      pongTimer = setTimeout(
        () => dispatch({ kind: "pongLost", clientAt, at: clientTime() }),
        PONG_TIMEOUT_MS,
      );
      current?.send({ type: "ping", clientAt });
    }
  };

  return {
    sync: { kind: "unsynced" },
    clockOffset: null,
    synchronise: (synchronisedLink) => {
      link = synchronisedLink;
      dispatch({ kind: "synchronise", at: clientTime() });
    },
    stop: () => dispatch({ kind: "stop" }),
    receivePong: ({ clientAt, serverAt }) =>
      dispatch({ kind: "pong", clientAt, serverAt, at: clientTime() }),
    reset: () => dispatch({ kind: "reset" }),
  };
});
