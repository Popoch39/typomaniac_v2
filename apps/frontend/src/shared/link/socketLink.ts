/**
 * The delay before the `attempt`-th try to reopen a socket that closed with `code`, counted from 1,
 * or `null` when it is not tried again.
 */
export type ReconnectDelay = (code: number, attempt: number) => number | null;

/** Where a reconnecting socket stands with its server, as its owner is told. */
export type SocketLink =
  /** No socket: never opened, or closed by its owner. */
  | { readonly kind: "idle" }
  /** `attempt` counts the tries to reopen the socket since it was last open, 0 for a first opening. */
  | { readonly kind: "opening"; readonly attempt: number }
  /** The socket read its first message: the server took it. */
  | { readonly kind: "open" }
  /** The socket dropped, and is reopened for the `attempt`-th time after `delay` milliseconds. */
  | { readonly kind: "backoff"; readonly attempt: number; readonly delay: number }
  /** The first opening closed before any message: why it was refused is being found. */
  | { readonly kind: "refusing" }
  /** The first opening was refused, told in words for the user. */
  | { readonly kind: "refused"; readonly refusal: string }
  /** The socket closed and is not reopened, with the reason the server closed it with. */
  | { readonly kind: "down"; readonly reason: string };

export type SocketLinkEvent =
  /** A socket is created, after the delay of a backoff or as the owner opens it. */
  | { readonly kind: "connect" }
  | { readonly kind: "receive" }
  | { readonly kind: "close"; readonly code: number; readonly reason: string }
  | { readonly kind: "refuse"; readonly refusal: string }
  /** The owner closes the socket. */
  | { readonly kind: "stop" };

export const IDLE_LINK: SocketLink = { kind: "idle" };

export function next(
  link: SocketLink,
  event: SocketLinkEvent,
  delayOf: ReconnectDelay,
): SocketLink {
  switch (event.kind) {
    case "connect":
      return { kind: "opening", attempt: link.kind === "backoff" ? link.attempt : 0 };
    case "receive":
      return link.kind === "opening" ? { kind: "open" } : link;
    case "close": {
      if (link.kind === "opening" && link.attempt === 0) return { kind: "refusing" };
      if (link.kind !== "opening" && link.kind !== "open") return link;
      // A reopening is a fresh opening: the server sends its first message again.
      const attempt = link.kind === "open" ? 1 : link.attempt + 1;
      const delay = delayOf(event.code, attempt);
      return delay === null
        ? { kind: "down", reason: event.reason }
        : { kind: "backoff", attempt, delay };
    }
    case "refuse":
      return link.kind === "refusing" ? { kind: "refused", refusal: event.refusal } : link;
    case "stop":
      return IDLE_LINK;
  }
}
