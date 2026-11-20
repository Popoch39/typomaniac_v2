import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
// The fair-play engine's own journals, so that the API's tests read the Games its tests are about.
import {
  machine,
  person,
  ROUND_MS,
  targetWords,
  typeJournal,
} from "../../../../packages/fair-play-engine/test/helpers/journal.ts";

export { targetWords };

/** A script typing every character `gapMs` after the last, each key held half as long. */
export const machineJournal = (gapMs = 60) => typeJournal(machine(gapMs));

/** A Game in which the Player typed nothing. */
export const idleJournal = (): GameEvent[] => [
  { type: "start", at: 0 },
  { type: "tick", at: ROUND_MS },
];

/**
 * A person typing around 90 ms per character: uneven intervals and hold times, keys often still down
 * when the next one goes down, rare words typed more slowly than frequent ones.
 */
export const personJournal = (seed = 7) => typeJournal(person(90, seed));

/** The Result the API saves with a journal. */
export const resultOf = (journal: readonly GameEvent[]) =>
  getResult(journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, targetWords)));
