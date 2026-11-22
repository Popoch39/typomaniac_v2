/**
 * Where a replay stands, independent of any clock: the instants passed in are those of the page, in
 * milliseconds, and positions are milliseconds into the journal.
 */
export type ReplayPlayback =
  | { readonly kind: "closed" }
  | (OpenReplay & { readonly kind: "paused"; readonly position: number })
  /** Moving from `from` since the instant `since`. */
  | (OpenReplay & { readonly kind: "playing"; readonly from: number; readonly since: number })
  | (OpenReplay & { readonly kind: "ended" });

type OpenReplay = {
  /** The Game being replayed, as `<duelId>/<round>`: one at a time. */
  readonly replayed: string;
  /** The length of its journal. */
  readonly duration: number;
  /** The share of the real rhythm it plays at: 1 is the rhythm of the journal. */
  readonly speed: number;
};

export type ReplayEvent =
  /** Plays a Game from its start, at its real rhythm, closing the one being replayed. */
  | {
      readonly kind: "open";
      readonly replayed: string;
      readonly duration: number;
      readonly at: number;
    }
  | { readonly kind: "close" }
  /** Pauses a replay that plays, plays one that is paused or ended. */
  | { readonly kind: "togglePause"; readonly at: number }
  | { readonly kind: "restart"; readonly at: number }
  | { readonly kind: "slow"; readonly speed: number; readonly at: number }
  /** The replay that plays reached the end of its journal. */
  | { readonly kind: "reachEnd" };

/** The speeds a replay can be played at, the real rhythm first. */
export const REPLAY_SPEEDS = [1, 0.5, 0.25] as const;

export const CLOSED_PLAYBACK: ReplayPlayback = { kind: "closed" };

/** The position shown at `now`, never before the start nor past the end of the journal. */
export function playbackPosition(playback: ReplayPlayback, now: number) {
  switch (playback.kind) {
    case "closed":
      return 0;
    case "paused":
      return playback.position;
    case "playing": {
      // An instant read before the replay started, as an animation frame's can be, shows its start.
      const moved = Math.max(0, now - playback.since) * playback.speed;
      return Math.min(playback.duration, playback.from + moved);
    }
    case "ended":
      return playback.duration;
  }
}

/** How long a replay that plays still takes to reach its end, null when it does not play. */
export function playbackEndsIn(playback: ReplayPlayback, now: number) {
  if (playback.kind !== "playing") return null;
  return (playback.duration - playbackPosition(playback, now)) / playback.speed;
}

/** `endIn` fires `reachEnd` after `ms`, in place of any timer armed before; `cancelEnd` disarms it. */
export type ReplayEffect =
  | { readonly kind: "endIn"; readonly ms: number }
  | { readonly kind: "cancelEnd" };

export function nextReplayPlayback(
  playback: ReplayPlayback,
  event: ReplayEvent,
): { readonly playback: ReplayPlayback; readonly effects: readonly ReplayEffect[] } {
  const next = step(playback, event);
  // Only an event carrying its instant can leave the replay playing.
  const endsIn = "at" in event ? playbackEndsIn(next, event.at) : null;
  return {
    playback: next,
    effects: endsIn === null ? [{ kind: "cancelEnd" }] : [{ kind: "endIn", ms: endsIn }],
  };
}

function step(playback: ReplayPlayback, event: ReplayEvent): ReplayPlayback {
  if (event.kind === "open") {
    const { replayed, duration, at } = event;
    return { kind: "playing", replayed, duration, speed: 1, from: 0, since: at };
  }
  if (event.kind === "close" || playback.kind === "closed") return CLOSED_PLAYBACK;
  const { replayed, duration, speed } = playback;
  switch (event.kind) {
    case "togglePause":
      if (playback.kind === "playing") {
        const position = playbackPosition(playback, event.at);
        return { kind: "paused", replayed, duration, speed, position };
      }
      // Plays on from where the replay was paused, or again from the start once it reached the end.
      return {
        kind: "playing",
        replayed,
        duration,
        speed,
        from: playback.kind === "paused" ? playback.position : 0,
        since: event.at,
      };
    case "restart":
      return { kind: "playing", replayed, duration, speed, from: 0, since: event.at };
    case "slow":
      // Goes on from where the replay is, at the new speed, playing, paused or ended as it was.
      if (playback.kind === "playing")
        return {
          ...playback,
          speed: event.speed,
          from: playbackPosition(playback, event.at),
          since: event.at,
        };
      return { ...playback, speed: event.speed };
    case "reachEnd":
      return playback.kind === "playing" ? { kind: "ended", replayed, duration, speed } : playback;
  }
}
