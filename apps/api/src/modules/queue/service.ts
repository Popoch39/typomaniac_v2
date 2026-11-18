import type { EntryHolder } from "@repo/queue";
import { acceptPairing, readPairing, refreshQueueEntry } from "@repo/queue";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { draftRankedDuel } from "../duel/service.ts";
import { readNicknames } from "../player/service.ts";
import { readStanding } from "../standing/service.ts";

// The Queue's keys and atomic steps live in `@repo/queue`, which the matchmaker uses too. This file
// re-exports them and stays the one import path inside the API.
export {
  acceptPairing,
  enterQueue,
  leaveQueue,
  pairingChannel,
  proposePairing,
  QUEUE_ENTRY_EXPIRY_MS,
  readPairing,
  readQueueEntry,
  refreshQueueEntry,
  tickMatchmaker,
} from "@repo/queue";
export type { DuelCreation, EntryHolder, PairingChange } from "@repo/queue";

/**
 * Records that the Player accepts the Pairing at `now`, as `acceptPairing` answers. The ranked Duel
 * the second acceptance creates is drafted ahead of that step, and shows each Player by Nickname and
 * by Rank as they stand now.
 */
export const acceptPairingAsPlayer = async (
  db: Db,
  redis: Redis,
  { pairingId, playerId }: { readonly pairingId: string; readonly playerId: string },
  {
    now,
    duelExpiryMs,
    duelConnectMs,
  }: { now: number; duelExpiryMs: number; duelConnectMs: number },
) => {
  const pairing = await readPairing(redis, pairingId);
  if (!pairing) return "gone";
  const nicknames = await readNicknames(db, pairing.playerIds);
  const [first, second] = await Promise.all(
    pairing.playerIds.map(async (pairedId) => {
      const nickname = nicknames.get(pairedId);
      if (nickname === undefined) return null;
      return { playerId: pairedId, nickname, rank: (await readStanding(db, pairedId)).rank };
    }),
  );
  if (!first || !second) return "gone";
  // Both Players learn the outcome from the Pairing channel, whichever instance holds them.
  return acceptPairing(redis, pairingId, playerId, {
    now,
    creation: draftRankedDuel(redis, [first, second], {
      expiryMs: duelExpiryMs,
      connectMs: duelConnectMs,
    }),
  });
};

type Refreshed = EntryHolder & {
  /** Closes the socket, whose entry was lost. */
  readonly close: () => void;
};

/**
 * Refreshes the Queue entries of the sockets this instance holds, every `intervalMs` while it
 * holds one. An entry lives only as long as it is refreshed: the entries of a crashed instance
 * expire.
 */
export const createEntryRefreshes = (
  redis: Redis,
  { expiryMs, intervalMs }: { readonly expiryMs: number; readonly intervalMs: number },
) => {
  const held = new Set<Refreshed>();
  let refreshing: ReturnType<typeof setInterval> | null = null;

  const refresh = async (refreshed: Refreshed) => {
    // Lost to an expiry this instance did not prevent in time: the Player is told by the close.
    if (!(await refreshQueueEntry(redis, refreshed, expiryMs))) refreshed.close();
  };
  const refreshAll = () => {
    for (const refreshed of held)
      refresh(refreshed).catch((error: unknown) =>
        console.error(`Could not refresh the Queue entry of ${refreshed.playerId}`, error),
      );
  };
  const stop = () => {
    if (refreshing !== null) clearInterval(refreshing);
    refreshing = null;
  };

  return {
    hold: (refreshed: Refreshed) => {
      held.add(refreshed);
      refreshing ??= setInterval(refreshAll, intervalMs);
    },
    release: (refreshed: Refreshed) => {
      held.delete(refreshed);
      if (held.size === 0) stop();
    },
    /** Refreshes no entry any more, as if this instance had crashed. */
    stop,
  };
};
