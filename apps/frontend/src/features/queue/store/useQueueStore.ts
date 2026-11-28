import { create } from "zustand";
import { eventTime } from "../../game/clock/eventTime.ts";
import { useGameStore } from "../../game/store/useGameStore.ts";
import {
  IDLE_QUEUE,
  type QueuePhase,
  type QueuePhaseEffect,
  type QueuePhaseEvent,
  nextQueuePhase,
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
// Handed by the app's entry, since a store may not import the router.
let goToDuel: (duelId: string) => void = () => {};

/** How the store takes the Player into the ranked Duel both accepted, from any page. */
export function setQueueDuelNavigation(navigate: (duelId: string) => void) {
  goToDuel = navigate;
}

export const useQueueStore = create<QueueState>()((set, get) => {
  const dispatch = (event: QueuePhaseEvent) => {
    const { phase, effects } = nextQueuePhase(get().phase, event);
    set({ phase, now: eventTime() });
    for (const effect of effects) perform(effect);
  };

  const perform = (effect: QueuePhaseEffect) => {
    switch (effect.kind) {
      case "close":
        return closeQueueSocket();
      case "open":
        return openQueueSocket({
          receive: (message) => dispatch({ kind: "receive", message, receivedAt: eventTime() }),
          link: (link) => dispatch({ kind: "link", link }),
        });
      case "sendAccept": {
        const { pairingId } = effect;
        // An acceptance the socket could not carry is not one: the Player can accept again.
        if (sendToQueue({ type: "accept", pairingId })) dispatch({ kind: "accepted", pairingId });
        return;
      }
      case "goToDuel":
        return goToDuel(effect.duelId);
      case "startClock":
        if (clockTimer === null)
          clockTimer = setInterval(() => set({ now: eventTime() }), CLOCK_REFRESH_MS);
        return;
      case "stopClock":
        if (clockTimer !== null) clearInterval(clockTimer);
        clockTimer = null;
        return;
      case "leaveGame":
        return useGameStore.getState().leave();
    }
  };

  return {
    phase: IDLE_QUEUE,
    now: eventTime(),
    enter: () => dispatch({ kind: "enter" }),
    leave: () => dispatch({ kind: "leave" }),
    accept: () => dispatch({ kind: "accept" }),
  };
});
