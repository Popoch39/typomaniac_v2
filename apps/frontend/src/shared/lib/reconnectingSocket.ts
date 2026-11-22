import { CloseCode, reconnectDelay } from "./reconnectDelay.ts";

type ReconnectDelay = (code: number, attempt: number) => number | null;

export type ReconnectingSocketHandlers = {
  /** Each message the socket reads, as sent. */
  readonly receive: (data: string) => void;
  /** Finds why the first opening was refused: a browser never shows why an upgrade failed. */
  readonly findRefusal: () => Promise<string>;
  /** Told, in words for the user, why the socket could not be opened. */
  readonly refuse: (refusal: string) => void;
  /**
   * The socket dropped and is about to be reopened for the `attempt`-th time since it last read a
   * message, counted from 1, unless this answers `false` because its owner no longer needs it.
   */
  readonly reconnect: (attempt: number) => boolean;
  /** The socket closed after its first message, and is not reopened, with the reason it closed with. */
  readonly disconnect: (reason: string) => void;
};

/**
 * One socket at a time, reopened after a drop or a server restart (`reconnectDelay`) as long as
 * its owner needs it, or after `delayOf` for each try when given. A socket that closes before its
 * first message was refused instead.
 */
export function createReconnectingSocket(delayOf: ReconnectDelay = reconnectDelay) {
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  // The try the pending retry makes, so that `retryNow` can make it at once.
  let retry: (() => void) | null = null;
  // Drops the socket as it stands, `null` once it closed.
  let dropSocket: (() => void) | null = null;

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
    const closed = async ({ code, reason }: { readonly code: number; readonly reason: string }) => {
      if (socket !== opened) return;
      dropSocket = null;
      if (received || attempt > 0) {
        // A reopening is a fresh opening: the server sends its first message again.
        const nextAttempt = received ? 1 : attempt + 1;
        const delay = delayOf(code, nextAttempt);
        if (delay === null || !reconnect(nextAttempt)) return disconnect(reason);
        retry = () => {
          cancelRetry();
          connect(url, handlers, nextAttempt);
        };
        retryTimer = setTimeout(retry, delay);
        return;
      }
      const refusal = await findRefusal();
      if (socket === opened) refuse(refusal);
    };
    opened.addEventListener("close", closed);
    dropSocket = () => {
      // Its own close event would come later, and reopen it a second time.
      opened.removeEventListener("close", closed);
      opened.close();
      void closed({ code: CloseCode.abnormal, reason: "" });
    };
  }

  function cancelRetry() {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
    retry = null;
  }

  function close() {
    cancelRetry();
    dropSocket = null;
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
    /** Makes the pending try to reopen the socket at once, if one is waiting. */
    retryNow: () => retry?.(),
    /** Drops the socket as a lost connection would, so that it is reopened as long as its owner needs it. */
    drop: () => dropSocket?.(),
    close,
  };
}
