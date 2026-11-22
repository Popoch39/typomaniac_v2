import { endlessReconnectDelay } from "../../../shared/lib/reconnectDelay.ts";
import { createReconnectingSocket } from "../../../shared/lib/reconnectingSocket.ts";
import { type PlayerServerMessage, parsePlayerMessage } from "../message/parsePlayerMessage.ts";

type PlayerSocketHandlers = {
  readonly receive: (message: PlayerServerMessage) => void;
  /** The socket could not be opened. */
  readonly refuse: () => void;
  /**
   * The socket dropped and is about to be reopened for the `attempt`-th time since it last read a
   * message, unless this answers `false` because the Player no longer needs it.
   */
  readonly reconnect: (attempt: number) => boolean;
  /** The socket closed and is not reopened. */
  readonly disconnect: () => void;
};

// Nothing is shown of a refusal: the Online count is ambient, and no action of the Player's failed.
const findRefusal = () => Promise.resolve("");

// Owned by the Online store because components may not run effects; a tab holds one Player socket.
// It is retried for as long as the Player is signed in, so that a Challenge can reach the tab (ADR 0017).
const socket = createReconnectingSocket(endlessReconnectDelay);

/** Opens the Player socket at `url` in place of any other, and hands over each message it reads. */
export function openPlayerSocket(
  url: string,
  { receive, refuse, ...handlers }: PlayerSocketHandlers,
) {
  socket.open(url, {
    ...handlers,
    receive: (data) => {
      const message = parsePlayerMessage(data);
      if (message !== null) receive(message);
    },
    findRefusal,
    refuse: () => refuse(),
  });
}

/** Tries to reopen a dropped Player socket now rather than after its delay. */
export function retryPlayerSocket() {
  socket.retryNow();
}

export function closePlayerSocket() {
  socket.close();
}
