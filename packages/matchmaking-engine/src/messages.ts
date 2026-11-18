/** Why a socket stops holding its Player's place in the Queue. */
export type QueueRemovalReason =
  /** Another socket of the same Player took the place over. */
  "replaced";

/** Instants are milliseconds since the epoch, on the server's clock. */
export type QueueServerMessage =
  /** `serverAt` is the instant the message was sent, so the client can tell how long ago `queuedAt` was. */
  | { readonly type: "queued"; readonly queuedAt: number; readonly serverAt: number }
  /** The last message of a socket, which the server then closes. */
  | { readonly type: "removed"; readonly reason: QueueRemovalReason };
