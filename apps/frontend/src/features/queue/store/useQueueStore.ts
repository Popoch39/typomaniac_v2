import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { create } from "zustand";
import { eventTime } from "../../game/clock/eventTime.ts";
import { type QueueEntry, waitingSeconds } from "../clock/waitingSeconds.ts";
import { closeQueueSocket, openQueueSocket } from "../socket/queueSocket.ts";

type QueueState = {
  readonly phase: "idle" | "connecting" | "queued" | "replaced" | "refused" | "disconnected";
  /** Whole seconds waited in the Queue, refreshed while the Player is queued. */
  readonly waitingSeconds: number;
  /** Why the Player could not enter the Queue, in words for the user. */
  readonly refusal: string | null;
  readonly enter: () => void;
  readonly leave: () => void;
};

const WAITING_REFRESH_MS = 250;

// Owned by the store because components may not run effects; one waiting time runs at a time.
let waitingTimer: ReturnType<typeof setInterval> | null = null;

function stopWaitingTimer() {
  if (waitingTimer !== null) clearInterval(waitingTimer);
  waitingTimer = null;
}

const initialState = { phase: "idle", waitingSeconds: 0, refusal: null } as const;

export const useQueueStore = create<QueueState>()((set, get) => {
  const follow = (entry: QueueEntry) => {
    stopWaitingTimer();
    const refresh = () => set({ waitingSeconds: waitingSeconds(entry, eventTime()) });
    refresh();
    waitingTimer = setInterval(refresh, WAITING_REFRESH_MS);
  };

  const receive = (message: QueueServerMessage) => {
    if (message.type === "queued") {
      const { queuedAt, serverAt } = message;
      set({ phase: "queued" });
      follow({ queuedAt, serverAt, receivedAt: eventTime() });
    } else if (message.type === "removed") {
      stopWaitingTimer();
      set({ phase: "replaced" });
    }
  };

  const disconnect = () => {
    // A removed Player was already told why: the close that follows adds nothing.
    if (get().phase !== "queued") return;
    stopWaitingTimer();
    set({ phase: "disconnected" });
  };

  const leave = () => {
    closeQueueSocket();
    stopWaitingTimer();
    set(initialState);
  };

  return {
    ...initialState,
    enter: () => {
      leave();
      set({ phase: "connecting" });
      openQueueSocket({
        receive,
        refuse: (refusal) => set({ phase: "refused", refusal }),
        disconnect,
      });
    },
    leave,
  };
});
