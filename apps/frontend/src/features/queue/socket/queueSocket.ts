import type { QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { createReconnectingSocket } from "../../../shared/lib/reconnectingSocket.ts";
import { queueQueryOptions } from "../api/queueQueryOptions.ts";
import { accountAgeRefusalOf } from "../refusal/accountAgeRefusalOf.ts";
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
    return accountAgeRefusalOf(error) ?? describeApiError(error, REFUSALS);
  }
}

// Owned by the Queue store because components may not run effects; a tab holds one Queue socket.
const socket = createReconnectingSocket();

/** Opens the Queue socket in place of any other, and hands over each message it reads. */
export function openQueueSocket({ receive, ...handlers }: QueueSocketHandlers) {
  socket.open(socketUrl(), {
    ...handlers,
    receive: (data) => {
      const message = parseQueueMessage(data);
      if (message !== null) receive(message);
    },
    findRefusal,
  });
}

export function sendToQueue(message: QueueClientMessage) {
  socket.send(JSON.stringify(message));
}

export function closeQueueSocket() {
  socket.close();
}
