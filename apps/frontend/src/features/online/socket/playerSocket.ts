import { endlessReconnectDelay } from "../../../shared/lib/reconnectDelay.ts";
import { createReconnectingSocket } from "../../../shared/lib/reconnectingSocket.ts";
import type { SocketLink } from "../../../shared/link/socketLink.ts";
import { type PlayerServerMessage, parsePlayerMessage } from "../message/parsePlayerMessage.ts";

/** What a tab sends on the Player socket, each about a Challenge. */
export type PlayerClientMessage =
  | { readonly type: "challenge"; readonly playerId: string }
  | {
      readonly type: "cancelChallenge" | "acceptChallenge" | "declineChallenge";
      readonly challengeId: string;
    };

type PlayerSocketHandlers = {
  readonly receive: (message: PlayerServerMessage) => void;
  /** Told each move of the link, until the Player socket is closed. */
  readonly link: (link: SocketLink) => void;
};

// Owned by the Online store because components may not run effects; a tab holds one Player socket.
// It is retried for as long as the Player is signed in, so that a Challenge can reach the tab (ADR 0017),
// a first opening included: nothing is shown of a refusal, since the Online count is ambient and no
// action of the Player's failed, and the server tells none.
const socket = createReconnectingSocket(endlessReconnectDelay);

/** Opens the Player socket at `url` in place of any other, and hands over each message it reads. */
export function openPlayerSocket(url: string, { receive, link }: PlayerSocketHandlers) {
  socket.open(url, {
    receive: (data) => {
      const message = parsePlayerMessage(data);
      if (message !== null) receive(message);
    },
    link,
  });
}

/** Tries to reopen a dropped Player socket now rather than after its delay. */
export function retryPlayerSocket() {
  socket.retryNow();
}

/** Sends the message if the socket is open; a message sent while it reconnects is lost. */
export function sendToPlayerSocket(message: PlayerClientMessage) {
  socket.send(JSON.stringify(message));
}

export function closePlayerSocket() {
  socket.close();
}
