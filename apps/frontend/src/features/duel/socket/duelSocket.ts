import type { ClientMessage, ServerMessage } from "@repo/duel-engine";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";
import { createReconnectingSocket } from "../../../shared/lib/reconnectingSocket.ts";
import type { SocketLink } from "../../../shared/link/socketLink.ts";
import { duelQueryOptions } from "../api/duelQueryOptions.ts";
import { parseServerMessage } from "../message/parseServerMessage.ts";

type DuelSocketHandlers = {
  readonly receive: (message: ServerMessage) => void;
  /**
   * Told each move of the link: a refusal says, in words for the user, why this Participant could
   * not take a seat in the Duel. The Participant closes the socket as it backs off once they no
   * longer need it.
   */
  readonly link: (link: SocketLink) => void;
};

const REFUSALS = { NICKNAME_REQUIRED: "Choose a Nickname to join this Duel." };
const FULL = "This Duel is full: two Participants are already in it.";
const UNREACHABLE = "The Duel could not be reached. Try again in a moment.";

const socketUrl = (duelId: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/duels/${duelId}/socket`;
};

// A browser never shows why an upgrade was refused: the Duel is read over HTTP to tell the reason.
async function findRefusal(duelId: string) {
  try {
    const { participants } = await queryClient.fetchQuery(duelQueryOptions(duelId));
    return participants.length === 2 ? FULL : UNREACHABLE;
  } catch (error) {
    return describeApiError(error, REFUSALS);
  }
}

// Owned by the Duel stores because components may not run effects; one Duel is open at a time.
const socket = createReconnectingSocket();

/** Opens the socket of a Duel in place of any other, and hands over each message it reads. */
export function openDuelSocket(duelId: string, { receive, ...handlers }: DuelSocketHandlers) {
  socket.open(socketUrl(duelId), {
    ...handlers,
    receive: (data) => {
      const message = parseServerMessage(data);
      if (message !== null) receive(message);
    },
    findRefusal: () => findRefusal(duelId),
  });
}

/** Whether `message` was sent: nothing is sent while the link is not open. */
export function sendToDuel(message: ClientMessage) {
  return socket.send(JSON.stringify(message));
}

/** Drops the socket as a lost connection would, so that it is reopened. */
export function dropDuelSocket() {
  socket.drop();
}

export function closeDuelSocket() {
  socket.close();
}
