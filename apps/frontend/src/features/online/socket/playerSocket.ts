import { createReconnectingSocket } from "../../../shared/lib/reconnectingSocket.ts";
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
  /** The socket could not be opened. */
  readonly refuse: () => void;
  /**
   * The socket dropped and is about to be reopened, unless this answers `false` because the
   * Player no longer needs it.
   */
  readonly reconnect: () => boolean;
  /** The socket closed and is not reopened. */
  readonly disconnect: () => void;
};

const socketUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/online/socket`;
};

// Nothing is shown of a refusal: the Online count is ambient, and no action of the Player's failed.
const findRefusal = () => Promise.resolve("");

// Owned by the Online store because components may not run effects; a tab holds one Player socket.
const socket = createReconnectingSocket();

/** Opens the Player socket in place of any other, and hands over each message it reads. */
export function openPlayerSocket({ receive, refuse, ...handlers }: PlayerSocketHandlers) {
  socket.open(socketUrl(), {
    ...handlers,
    receive: (data) => {
      const message = parsePlayerMessage(data);
      if (message !== null) receive(message);
    },
    findRefusal,
    refuse: () => refuse(),
  });
}

/** Sends the message if the socket is open; a message sent while it reconnects is lost. */
export function sendToPlayerSocket(message: PlayerClientMessage) {
  socket.send(JSON.stringify(message));
}

export function closePlayerSocket() {
  socket.close();
}
