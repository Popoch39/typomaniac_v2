import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import {
  applyEvent,
  createGame,
  type Game,
  type GameEvent,
  type KeyPress,
} from "@repo/typing-engine";

/** The Game as it stood from `at` on, in milliseconds since the start of the journal. */
export type ReplayFrame = { readonly at: number; readonly game: Game };

/** Everything a replay is drawn from: one frame per Event of the journal, in order. */
export type ReplayTimeline = {
  readonly frames: readonly ReplayFrame[];
  /** Milliseconds from the start of the journal to its last Event. */
  readonly duration: number;
  /** Every KeyPress of the Game, its instants counted from the start of the journal. */
  readonly keyPresses: readonly KeyPress[];
};

const instantOf = (event: GameEvent) => ("at" in event ? event.at : null);

/**
 * The timeline of a saved Duel Game: its journal replayed by the typing engine over its Target words,
 * as the server replays it, with the instant each Event changed the Game. Instants are counted from the
 * first Event that has one, so a replay starts at zero whatever the client clock said.
 */
export function replayTimeline(
  words: readonly string[],
  journal: readonly GameEvent[],
): ReplayTimeline {
  const origin = journal.map(instantOf).find((at) => at !== null) ?? 0;
  let frame: ReplayFrame = { at: 0, game: createGame(DUEL_GAME_CONFIG, words) };
  const frames = [frame];
  for (const event of journal) {
    const instant = instantOf(event);
    // Words added carry no instant: they arrive with the Event before them.
    frame = {
      at: instant === null ? frame.at : Math.max(frame.at, instant - origin),
      game: applyEvent(frame.game, event),
    };
    frames.push(frame);
  }
  return {
    frames,
    duration: frame.at,
    keyPresses: frame.game.keyPresses.map(({ at, code, releasedAt }) => ({
      at: at - origin,
      code,
      releasedAt: releasedAt === null ? null : releasedAt - origin,
    })),
  };
}

/** The Game as the replay shows it `position` milliseconds into the journal. */
export function frameAt({ frames }: ReplayTimeline, position: number): Game {
  // The last frame at or before the position: binary search, as the replay asks at every animation frame.
  let low = 0;
  let high = frames.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((frames[middle]?.at ?? 0) <= position) low = middle;
    else high = middle - 1;
  }
  const frame = frames[low];
  if (frame === undefined) throw new RangeError("A replay timeline always has its first frame.");
  return frame.game;
}
