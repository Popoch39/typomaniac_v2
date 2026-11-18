import { DEFAULT_MATCHMAKING_CONFIG, type MatchmakingConfig } from "./config.ts";

export type QueuedPlayer = {
  playerId: string;
  mmr: number;
  /** Instant the Player entered the Queue, in milliseconds on the same clock as `now`. */
  queuedAt: number;
};

/** Two Player ids: first the Player whose window decided, then the Player found inside it. */
export type Pair = [string, string];

function mmrWindow(waitedMs: number, config: MatchmakingConfig): number {
  // The instant of entry and `now` may come from two processes: a negative wait must not shrink the window.
  const steps = Math.floor(Math.max(0, waitedMs) / config.windowStepIntervalMs);
  return config.initialWindow + steps * config.windowStep;
}

/** Longest-waiting first; the id settles equal instants so the order never depends on the snapshot's. */
function byEntry(a: QueuedPlayer, b: QueuedPlayer): number {
  if (a.queuedAt !== b.queuedAt) return a.queuedAt - b.queuedAt;
  return a.playerId < b.playerId ? -1 : 1;
}

export function pairPlayers(
  queued: readonly QueuedPlayer[],
  now: number,
  config: MatchmakingConfig = DEFAULT_MATCHMAKING_CONFIG,
): Pair[] {
  const waiting = [...queued].sort(byEntry);
  const paired = new Set<string>();
  const pairs: Pair[] = [];
  for (const [index, player] of waiting.entries()) {
    if (paired.has(player.playerId)) continue;
    const window = mmrWindow(now - player.queuedAt, config);
    let closest: QueuedPlayer | undefined;
    // Everyone before `index` already had their turn: only later entrants can still be taken.
    for (const candidate of waiting.slice(index + 1)) {
      if (paired.has(candidate.playerId)) continue;
      const gap = Math.abs(candidate.mmr - player.mmr);
      if (gap > window) continue;
      // Strictly closer only: at equal gaps the earlier entrant, met first, is kept (PAIR-3).
      if (closest === undefined || gap < Math.abs(closest.mmr - player.mmr)) closest = candidate;
    }
    if (closest === undefined) continue;
    paired.add(player.playerId).add(closest.playerId);
    pairs.push([player.playerId, closest.playerId]);
  }
  return pairs;
}
