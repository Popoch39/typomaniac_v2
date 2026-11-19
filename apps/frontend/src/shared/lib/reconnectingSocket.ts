import { reconnectDelay } from "./reconnectDelay.ts";

export type ReconnectingSocketHandlers = {
  /** Each message the socket reads, as sent. */
  readonly receive: (data: string) => void;
  /** Finds why the first opening was refused: a browser never shows why an upgrade failed. */
  readonly findRefusal: () => Promise<string>;
  /** Told, in words for the user, why the socket could not be opened. */
  readonly refuse: (refusal: string) => void;
  /**
   * The socket dropped and is about to be reopened, unless this answers `false` because its owner
   * no longer needs it.
   */
  readonly reconnect: () => boolean;
  /** The socket closed after its first message, and is not reopened. */
  readonly disconnect: () => void;
};

/**
 * One socket at a time, reopened after a drop or a server restart (`reconnectDelay`) as long as
 * its owner needs it. A socket that closes before its first message was refused instead.
 */
export function createReconnectingSocket() {
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  // `attempt` counts the tries to reopen the socket since it last read a message, 0 for a first opening.
  function connect(url: string, handlers: ReconnectingSocketHandlers, attempt: number) {
    const { receive, findRefusal, refuse, reconnect, disconnect } = handlers;
    const opened = new WebSocket(url);
    socket = opened;
    let received = false;
    opened.addEventListener("message", (event) => {
      received = true;
      receive(String(event.data));
    });
    opened.addEventListener("close", async ({ code }) => {
      if (socket !== opened) return;
      if (received || attempt > 0) {
        // A reopening is a fresh opening: the server sends its first message again.
        const nextAttempt = received ? 1 : attempt + 1;
        const delay = reconnectDelay(code, nextAttempt);
        if (delay === null || !reconnect()) return disconnect();
        retryTimer = setTimeout(() => {
          retryTimer = null;
          connect(url, handlers, nextAttempt);
        }, delay);
        return;
      }
      const refusal = await findRefusal();
      if (socket === opened) refuse(refusal);
    });
  }

  function close() {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
    socket?.close();
    socket = null;
  }

  return {
    /** Opens the socket at `url` in place of any other. */
    open: (url: string, handlers: ReconnectingSocketHandlers) => {
      close();
      connect(url, handlers, 0);
    },
    send: (data: string) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(data);
    },
    close,
  };
}
