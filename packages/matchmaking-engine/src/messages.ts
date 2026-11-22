import type { Ornament, Rank } from "@repo/ranked-engine";

/** How one Player of a Pairing is shown to both. */
export type PairingSide = {
  readonly nickname: string;
  /** `null` when the provider gave no picture. */
  readonly avatarUrl: string | null;
  /** `null` while the Player is Unranked. */
  readonly rank: Rank | null;
  readonly ornament: Ornament;
};

/** Why a socket stops holding its Player's place in the Queue. */
export type QueueRemovalReason =
  /** Another socket of the same Player took the place over. */
  | "replaced"
  /** The Player did not accept a Pairing in time. */
  | "notAccepted"
  /** The Player accepted a Challenge, whose Custom Duel takes them out of the Queue. */
  | "challenged";

/** Instants are milliseconds since the epoch, on the server's clock. */
export type QueueServerMessage =
  /** `serverAt` is the instant the message was sent, so the client can tell how long ago `queuedAt` was. */
  | { readonly type: "queued"; readonly queuedAt: number; readonly serverAt: number }
  /** A Duel was found: `pairingId` names the Pairing to accept, `players` both sides of it. */
  | {
      readonly type: "proposed";
      readonly pairingId: string;
      readonly acceptWithinMs: number;
      readonly players: { readonly self: PairingSide; readonly opponent: PairingSide };
    }
  /** The Opponent did not accept: the Player waits again, from their original instant of entry. */
  | { readonly type: "requeued"; readonly queuedAt: number; readonly serverAt: number }
  /** The last message of a socket, which the server then closes. */
  | { readonly type: "removed"; readonly reason: QueueRemovalReason }
  /** Both accepted: the ranked Duel to go to. The last message of a socket, which the server then closes. */
  | { readonly type: "paired"; readonly duelId: string };

export type QueueClientMessage = { readonly type: "accept"; readonly pairingId: string };
