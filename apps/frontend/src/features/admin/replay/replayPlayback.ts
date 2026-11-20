/**
 * Where a replay stands, independent of any clock: the instants passed in are those of the page, in
 * milliseconds, and positions are milliseconds into the journal.
 */
export type ReplayPlayback = {
  /** The position at `playingSince`, or where the replay is paused. */
  readonly position: number;
  /** The instant the replay last started moving from `position`, null while paused. */
  readonly playingSince: number | null;
  /** The share of the real rhythm it plays at: 1 is the rhythm of the journal. */
  readonly speed: number;
};

/** The speeds a replay can be played at, the real rhythm first. */
export const REPLAY_SPEEDS = [1, 0.5, 0.25] as const;

export function startPlayback(now: number): ReplayPlayback {
  return { position: 0, playingSince: now, speed: 1 };
}

/** The position shown at `now`, never before the start nor past the end of the journal. */
export function playbackPosition(
  { position, playingSince, speed }: ReplayPlayback,
  now: number,
  duration: number,
) {
  // An instant read before the replay started, as an animation frame's can be, shows its start.
  const moved = playingSince === null ? 0 : Math.max(0, now - playingSince) * speed;
  return Math.min(duration, position + moved);
}

/** Moving, and not yet at the end of the journal. */
export function isPlaying(playback: ReplayPlayback, now: number, duration: number) {
  return playback.playingSince !== null && playbackPosition(playback, now, duration) < duration;
}

export function pausePlayback(
  playback: ReplayPlayback,
  now: number,
  duration: number,
): ReplayPlayback {
  return { ...playback, position: playbackPosition(playback, now, duration), playingSince: null };
}

/** Plays on from where the replay was paused, or again from the start once it reached the end. */
export function resumePlayback(
  playback: ReplayPlayback,
  now: number,
  duration: number,
): ReplayPlayback {
  const position = playbackPosition(playback, now, duration);
  return { ...playback, position: position >= duration ? 0 : position, playingSince: now };
}

/** Plays again from the start, at the speed chosen. */
export function restartPlayback(playback: ReplayPlayback, now: number): ReplayPlayback {
  return { ...playback, position: 0, playingSince: now };
}

/** Goes on from where the replay is, at `speed`, playing or paused as it was. */
export function slowPlayback(
  playback: ReplayPlayback,
  speed: number,
  now: number,
  duration: number,
): ReplayPlayback {
  return {
    position: playbackPosition(playback, now, duration),
    playingSince: playback.playingSince === null ? null : now,
    speed,
  };
}
