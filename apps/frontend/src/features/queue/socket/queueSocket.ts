import type { QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { reconnectDelay } from "../../../shared/lib/reconnectDelay.ts";
import { queueQueryOptions } from "../api/queueQueryOptions.ts";
import { parseQueueMessage } from "../message/parseQueueMessage.ts";

type QueueSocketHandlers = {
  readonly receive: (message: QueueServerMessage) => void;
  /** Told, in words for the user, why this Player could not enter the Queue. */
  readonly refuse: (refusal: string) => void;
  /**
   * The socket dropped and is about to be reopened, unless this answers `false` because the
   * Player no longer needs it.
   */
  readonly reconnect: () => boolean;
  /** The socket closed after the Player was queued, and is not reopened. */
  readonly disconnect: () => void;
};

const REFUSALS = {
  UNAUTHORIZED: "Sign in to enter the Queue.",
  NICKNAME_REQUIRED: "Choose a Nickname to enter the Queue.",
  RANKED_DUEL_UNFINISHED: "Finish your ranked Duel before entering the Queue again.",
};
const UNREACHABLE = "The Queue could not be reached. Try again in a moment.";

const socketUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/queue/socket`;
};

// A browser never shows why an upgrade was refused: the Queue is read over HTTP to tell the reason.
async function findRefusal() {
  try {
    await queryClient.fetchQuery(queueQueryOptions());
    return UNREACHABLE;
  } catch (error) {
    return describeApiError(error, REFUSALS);
  }
}

// Owned by the Queue store because components may not run effects; a tab holds one Queue socket.
let socket: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

// `attempt` counts the tries to reopen the socket since it was last queued, 0 for a first entry.
function connect(handlers: QueueSocketHandlers, attempt: number) {
  const { receive, refuse, reconnect, disconnect } = handlers;
  const opened = new WebSocket(socketUrl());
  socket = opened;
  let queued = false;
  opened.addEventListener("message", (event) => {
    queued = true;
    const message = parseQueueMessage(String(event.data));
    if (message !== null) receive(message);
  });
  opened.addEventListener("close", async ({ code }) => {
    if (socket !== opened) return;
    if (queued || attempt > 0) {
      // A reconnection is a fresh entry: the server sends the queued message first.
      const nextAttempt = queued ? 1 : attempt + 1;
      const delay = reconnectDelay(code, nextAttempt);
      if (delay === null || !reconnect()) return disconnect();
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect(handlers, nextAttempt);
      }, delay);
      return;
    }
    const refusal = await findRefusal();
    if (socket === opened) refuse(refusal);
  });
}

/** Opens the Queue socket in place of any other, and hands over each message it reads. */
export function openQueueSocket(handlers: QueueSocketHandlers) {
  closeQueueSocket();
  connect(handlers, 0);
}

export function sendToQueue(message: QueueClientMessage) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

export function closeQueueSocket() {
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = null;
  socket?.close();
  socket = null;
}
