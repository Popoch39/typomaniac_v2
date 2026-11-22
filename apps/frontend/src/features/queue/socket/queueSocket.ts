import type { QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { createReconnectingSocket } from "../../../shared/lib/reconnectingSocket.ts";
import type { SocketLink } from "../../../shared/link/socketLink.ts";
import { queueQueryOptions } from "../api/queueQueryOptions.ts";
import { accountAgeRefusalOf } from "../refusal/accountAgeRefusalOf.ts";
import { parseQueueMessage } from "../message/parseQueueMessage.ts";

type QueueSocketHandlers = {
  readonly receive: (message: QueueServerMessage) => void;
  /**
   * Told each move of the link: a refusal says, in words for the user, why this Player could not
   * enter the Queue. The Player closes the socket as it backs off once they no longer need it.
   */
  readonly link: (link: SocketLink) => void;
};

const REFUSALS = {
  UNAUTHORIZED: "Sign in to enter the Queue.",
  NICKNAME_REQUIRED: "Choose a Nickname to enter the Queue.",
  RANKED_DUEL_UNFINISHED: "Finish your ranked Duel before entering the Queue again.",
  RANKED_SUSPENDED: "You are suspended from ranked play: the Queue opens again when it ends.",
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

/** Whether `message` was sent: nothing is sent while the link is not open. */
export function sendToQueue(message: QueueClientMessage) {
  return socket.send(JSON.stringify(message));
}

export function closeQueueSocket() {
  socket.close();
}
