import type { PairingSide } from "@repo/matchmaking-engine";
import type { EntryHolder } from "@repo/queue";
import { acceptPairing, readPairing, refreshQueueEntry } from "@repo/queue";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { draftRankedDuel } from "../duel/service.ts";
import { readWornOrnaments } from "../ornament/service.ts";
import { readNicknamesAndAvatars } from "../player/service.ts";
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
 * the second acceptance creates is drafted ahead of that step, and shows each Player by Nickname,
 * Avatar and Rank as they stand now.
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
  const players = await readNicknamesAndAvatars(db, pairing.playerIds);
  const [first, second] = await Promise.all(
    pairing.playerIds.map(async (pairedId) => {
      const player = players.get(pairedId);
      if (player === undefined) return null;
      return { playerId: pairedId, ...player, rank: (await readStanding(db, pairedId)).rank };
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

/**
 * The Pairing as the Player is shown it: their own side and the Opponent's, each by Nickname,
 * Avatar, Rank and worn Ornament as they stand now. `null` once the Pairing is no longer theirs.
 */
export const readPairingSides = async (
  db: Db,
  redis: Redis,
  { pairingId, playerId }: { readonly pairingId: string; readonly playerId: string },
): Promise<{ self: PairingSide; opponent: PairingSide } | null> => {
  const pairing = await readPairing(redis, pairingId);
  if (!pairing?.playerIds.includes(playerId)) return null;
  const opponentId = pairing.playerIds.find((pairedId) => pairedId !== playerId);
  if (opponentId === undefined) return null;
  const playerIds = [playerId, opponentId];
  const [players, ornaments, [selfRank = null, opponentRank = null]] = await Promise.all([
    readNicknamesAndAvatars(db, playerIds),
    readWornOrnaments(db, playerIds),
    Promise.all(playerIds.map(async (pairedId) => (await readStanding(db, pairedId)).rank)),
  ]);
  const sideOf = (pairedId: string, rank: PairingSide["rank"]): PairingSide | null => {
    const player = players.get(pairedId);
    if (player === undefined) return null;
    return { ...player, rank, ornament: ornaments.get(pairedId) ?? null };
  };
  const self = sideOf(playerId, selfRank);
  const opponent = sideOf(opponentId, opponentRank);
  return self && opponent ? { self, opponent } : null;
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
