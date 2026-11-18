/** Why a socket stops holding its Player's place in the Queue. */
export type QueueRemovalReason =
  /** Another socket of the same Player took the place over. */
  | "replaced"
  /** The Player did not accept a Pairing in time. */
  | "notAccepted";

/** Instants are milliseconds since the epoch, on the server's clock. */
export type QueueServerMessage =
  /** `serverAt` is the instant the message was sent, so the client can tell how long ago `queuedAt` was. */
  | { readonly type: "queued"; readonly queuedAt: number; readonly serverAt: number }
  /** A Duel was found. Nothing here tells who the Opponent is: `pairingId` only names the Pairing to accept. */
  | { readonly type: "proposed"; readonly pairingId: string; readonly acceptWithinMs: number }
  /** The Opponent did not accept: the Player waits again, from their original instant of entry. */
  | { readonly type: "requeued"; readonly queuedAt: number; readonly serverAt: number }
  /** The last message of a socket, which the server then closes. */
  | { readonly type: "removed"; readonly reason: QueueRemovalReason }
  /** Both accepted: the ranked Duel to go to. The last message of a socket, which the server then closes. */
  | { readonly type: "paired"; readonly duelId: string };

export type QueueClientMessage = { readonly type: "accept"; readonly pairingId: string };
