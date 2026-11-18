import type { GameConfig } from "@repo/typing-engine";

export const DUEL_GAME_CONFIG: GameConfig = { mode: "time", seconds: 30 };
// More than anyone types in 30 seconds: no word is added during a Duel.
export const DUEL_WORD_COUNT = 250;
/** Between both Participants being connected and the Start. */
export const COUNTDOWN_MS = 3000;
/** How long after the deadline the server waits for a client's last Tick before applying it itself. */
export const END_GRACE_MS = 2000;
/** How far from the announced Start, either way, the server still accepts a Participant's start. */
export const START_WINDOW_MS = 1000;
