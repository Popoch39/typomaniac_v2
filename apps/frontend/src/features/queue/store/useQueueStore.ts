import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { create } from "zustand";
import type { SocketLink } from "../../../shared/link/socketLink.ts";
import { eventTime } from "../../game/clock/eventTime.ts";
import { type QueueEntry, waitingSeconds } from "../clock/waitingSeconds.ts";
import { closeQueueSocket, openQueueSocket } from "../socket/queueSocket.ts";
import { usePairingStore } from "./usePairingStore.ts";

type QueueState = {
  readonly phase:
    | "idle"
    | "connecting"
    | "queued"
    /** A Pairing awaits acceptance, by the Player or by the Opponent. */
    | "proposed"
    | "paired"
    | "replaced"
    | "notAccepted"
    | "refused"
    | "disconnected";
  /** Whole seconds waited in the Queue, refreshed while the Player is queued. */
  readonly waitingSeconds: number;
  /** Why the Player could not enter the Queue, in words for the user. */
  readonly refusal: string | null;
  /** Whether the Player is back in the Queue because the Opponent did not accept. */
  readonly isRequeued: boolean;
  /** Whether the socket dropped and is being reopened, the Queue staying shown meanwhile. */
  readonly isReconnecting: boolean;
  /** The ranked Duel to go to once both accepted. */
  readonly duelId: string | null;
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

const initialState = {
  phase: "idle",
  waitingSeconds: 0,
  refusal: null,
  isRequeued: false,
  isReconnecting: false,
  duelId: null,
} as const;

export const useQueueStore = create<QueueState>()((set, get) => {
  const follow = (entry: QueueEntry) => {
    stopWaitingTimer();
    const refresh = () => set({ waitingSeconds: waitingSeconds(entry, eventTime()) });
    refresh();
    waitingTimer = setInterval(refresh, WAITING_REFRESH_MS);
  };

  const receive = (message: QueueServerMessage) => {
    const receivedAt = eventTime();
    // The first message of a reopened socket.
    if (get().isReconnecting) set({ isReconnecting: false });
    if (message.type === "queued" || message.type === "requeued") {
      const { queuedAt, serverAt } = message;
      usePairingStore.getState().close();
      set({ phase: "queued", isRequeued: message.type === "requeued" });
      follow({ queuedAt, serverAt, receivedAt });
      return;
    }
    stopWaitingTimer();
    if (message.type === "proposed") {
      const { pairingId, players, acceptWithinMs } = message;
      usePairingStore.getState().propose(pairingId, players, { acceptWithinMs, receivedAt });
      set({ phase: "proposed" });
      return;
    }
    usePairingStore.getState().close();
    if (message.type === "paired") set({ phase: "paired", duelId: message.duelId });
    else set({ phase: message.reason === "replaced" ? "replaced" : "notAccepted" });
  };

  // A removed or paired Player was already told why: the close that follows adds nothing.
  const isInQueue = () => {
    const { phase } = get();
    return phase === "queued" || phase === "proposed";
  };

  const reconnect = () => {
    if (!isInQueue()) return closeQueueSocket();
    set({ isReconnecting: true });
  };

  const disconnect = () => {
    if (!isInQueue()) return;
    stopWaitingTimer();
    usePairingStore.getState().close();
    set({ phase: "disconnected", isReconnecting: false });
  };

  const followLink = (link: SocketLink) => {
    if (link.kind === "refused") set({ phase: "refused", refusal: link.refusal });
    else if (link.kind === "backoff") reconnect();
    else if (link.kind === "down") disconnect();
  };

  const leave = () => {
    closeQueueSocket();
    stopWaitingTimer();
    usePairingStore.getState().close();
    set(initialState);
  };

  return {
    ...initialState,
    enter: () => {
      leave();
      set({ phase: "connecting" });
      openQueueSocket({ receive, link: followLink });
    },
    leave,
  };
});
