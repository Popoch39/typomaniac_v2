import { create } from "zustand";
import { eventTime } from "../../game/clock/eventTime.ts";
import { type AcceptWindow, acceptSecondsLeft } from "../clock/acceptSecondsLeft.ts";
import { sendToQueue } from "../socket/queueSocket.ts";

type PairingState = {
  /** The Pairing proposed to the Player, `null` when none awaits their answer. */
  readonly pairingId: string | null;
  /** Whole seconds left to accept, refreshed while the Pairing is proposed. */
  readonly secondsLeft: number;
  /** Whole seconds there were to accept when the Pairing was proposed, what the countdown drains from. */
  readonly acceptSeconds: number;
  /** Whether the Player accepted and now waits for the Opponent. */
  readonly isAccepted: boolean;
  readonly propose: (pairingId: string, window: AcceptWindow) => void;
  readonly accept: () => void;
  readonly close: () => void;
};

const COUNTDOWN_REFRESH_MS = 100;

// Owned by the store because components may not run effects; one Pairing is proposed at a time.
let countdownTimer: ReturnType<typeof setInterval> | null = null;

function stopCountdownTimer() {
  if (countdownTimer !== null) clearInterval(countdownTimer);
  countdownTimer = null;
}

const initialState = {
  pairingId: null,
  secondsLeft: 0,
  acceptSeconds: 0,
  isAccepted: false,
} as const;

export const usePairingStore = create<PairingState>()((set, get) => ({
  ...initialState,
  propose: (pairingId, window) => {
    stopCountdownTimer();
    const refresh = () => set({ secondsLeft: acceptSecondsLeft(window, eventTime()) });
    set({
      pairingId,
      isAccepted: false,
      acceptSeconds: acceptSecondsLeft(window, window.receivedAt),
    });
    refresh();
    countdownTimer = setInterval(refresh, COUNTDOWN_REFRESH_MS);
  },
  accept: () => {
    const { pairingId } = get();
    if (pairingId === null) return;
    sendToQueue({ type: "accept", pairingId });
    set({ isAccepted: true });
  },
  close: () => {
    stopCountdownTimer();
    set(initialState);
  },
}));
