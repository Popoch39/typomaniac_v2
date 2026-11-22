import { create } from "zustand";
import { eventTime } from "../../game/clock/eventTime.ts";
import {
  IDLE_QUEUE,
  type QueuePhase,
  type QueuePhaseEvent,
  nextQueuePhase,
  shownQueuePhase,
} from "../phase/queuePhase.ts";
import { closeQueueSocket, openQueueSocket, sendToQueue } from "../socket/queueSocket.ts";

type QueueState = {
  readonly phase: QueuePhase;
  /** This client's clock, refreshed while a waiting time or an accept countdown is shown. */
  readonly now: number;
  readonly enter: () => void;
  readonly leave: () => void;
  /** Accepts the Pairing proposed to the Player, once the socket can carry it. */
  readonly accept: () => void;
};

const CLOCK_REFRESH_MS = 100;

// Owned by the store because components may not run effects; one Queue is shown at a time.
let clockTimer: ReturnType<typeof setInterval> | null = null;

export const useQueueStore = create<QueueState>()((set, get) => {
  // The clock runs exactly while a waiting time or an accept countdown is on screen.
  const followClock = (phase: QueuePhase) => {
    const shown = shownQueuePhase(phase).kind;
    const isShowingTime = shown === "queued" || shown === "proposed";
    if (!isShowingTime && clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
    if (isShowingTime && clockTimer === null)
      clockTimer = setInterval(() => set({ now: eventTime() }), CLOCK_REFRESH_MS);
  };

  const dispatch = (event: QueuePhaseEvent) => {
    const { phase, effects } = nextQueuePhase(get().phase, event);
    set({ phase, now: eventTime() });
    followClock(phase);
    for (const effect of effects) {
      if (effect.kind === "close") {
        closeQueueSocket();
        continue;
      }
      openQueueSocket({
        receive: (message) => dispatch({ kind: "receive", message, receivedAt: eventTime() }),
        link: (link) => dispatch({ kind: "link", link }),
      });
    }
  };

  return {
    phase: IDLE_QUEUE,
    now: eventTime(),
    enter: () => dispatch({ kind: "enter" }),
    leave: () => dispatch({ kind: "leave" }),
    accept: () => {
      const { phase } = get();
      if (phase.kind !== "proposed" || phase.accepted) return;
      const { pairingId } = phase;
      // An acceptance the socket could not carry is not one: the Player can accept again.
      if (sendToQueue({ type: "accept", pairingId })) dispatch({ kind: "accepted", pairingId });
    },
  };
});
