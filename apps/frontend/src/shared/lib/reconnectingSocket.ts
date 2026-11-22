import {
  IDLE_LINK,
  nextSocketLink,
  type ReconnectDelay,
  type ReconnectPolicy,
  type SocketLink,
  type SocketLinkEvent,
} from "../link/socketLink.ts";
import { CloseCode, reconnectDelay } from "./reconnectDelay.ts";

export type ReconnectingSocketHandlers = {
  /** Each message the socket reads, as sent. */
  readonly receive: (data: string) => void;
  /**
   * Finds why the first opening was refused: a browser never shows why an upgrade failed. Without
   * it, a first opening that closes is retried like a drop, the owner having no refusal to tell.
   */
  readonly findRefusal?: () => Promise<string>;
  /**
   * Told each move of the link, until the owner closes the socket. An owner that no longer needs
   * the socket as it backs off closes it, so that it is not reopened.
   */
  readonly link: (link: SocketLink) => void;
};

/**
 * One socket at a time, reopened after a drop or a server restart (`reconnectDelay`) as long as
 * its owner needs it, or after `delayOf` for each try when given. A socket that closes before its
 * first message was refused instead, when its owner can find why.
 */
export function createReconnectingSocket(delayOf: ReconnectDelay = reconnectDelay) {
  let link = IDLE_LINK;
  // How the socket answers a closing, which depends on whether its owner can find a refusal.
  let policy: ReconnectPolicy = { delayOf, refusesFirstOpening: true };
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  // The try the pending retry makes, so that `retryNow` can make it at once.
  let retry: (() => void) | null = null;
  // Drops the socket as it stands, `null` once it closed.
  let dropSocket: (() => void) | null = null;

  function connect(url: string, handlers: ReconnectingSocketHandlers) {
    const opened = new WebSocket(url);
    socket = opened;
    const { findRefusal } = handlers;
    policy = { delayOf, refusesFirstOpening: findRefusal !== undefined };

    // The effects the link's new kind calls for come before the owner is told, so that an owner
    // closing the socket from its handler cancels them.
    const move = (event: SocketLinkEvent) => {
      const previous = link;
      link = nextSocketLink(link, event, policy);
      if (link === previous) return;
      if (link.kind === "backoff") {
        retry = () => {
          cancelRetry();
          connect(url, handlers);
        };
        retryTimer = setTimeout(retry, link.delay);
      }
      handlers.link(link);
    };

    opened.addEventListener("message", (event) => {
      if (socket !== opened) return;
      move({ kind: "receive" });
      handlers.receive(String(event.data));
    });
    const closed = async ({ code, reason }: { readonly code: number; readonly reason: string }) => {
      if (socket !== opened) return;
      dropSocket = null;
      move({ kind: "close", code, reason });
      if (link.kind !== "refusing" || findRefusal === undefined) return;
      const refusal = await findRefusal();
      if (socket === opened) move({ kind: "refuse", refusal });
    };
    opened.addEventListener("close", closed);
    dropSocket = () => {
      // Its own close event would come later, and reopen it a second time.
      opened.removeEventListener("close", closed);
      opened.close();
      void closed({ code: CloseCode.abnormal, reason: "" });
    };
    move({ kind: "connect" });
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
    link = nextSocketLink(link, { kind: "stop" }, policy);
  }

  return {
    /** Opens the socket at `url` in place of any other. */
    open: (url: string, handlers: ReconnectingSocketHandlers) => {
      close();
      connect(url, handlers);
    },
    /** Whether `data` was sent: nothing is sent unless the link is open. */
    send: (data: string) => {
      if (link.kind !== "open" || socket?.readyState !== WebSocket.OPEN) return false;
      socket.send(data);
      return true;
    },
    /** Makes the pending try to reopen the socket at once, if one is waiting. */
    retryNow: () => retry?.(),
    /** Drops the socket as a lost connection would, so that it is reopened as long as its owner needs it. */
    drop: () => dropSocket?.(),
    close,
  };
}
