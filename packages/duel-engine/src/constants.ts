import type { GameConfig } from "@repo/typing-engine";

// Narrowed to its time Mode, so the server can read the duration its deadline is set from.
export const DUEL_GAME_CONFIG = { mode: "time", seconds: 30 } as const satisfies GameConfig;
// More than anyone types in 30 seconds: no word is added during a Round.
export const DUEL_WORD_COUNT = 250;
/** Between both Participants being connected and the Start. */
export const COUNTDOWN_MS = 3000;
/** How long after the deadline the server waits for a client's last Tick before applying it itself. */
export const END_GRACE_MS = 2000;
/** How far from the announced Start, either way, the server still accepts a Participant's start. */
export const START_WINDOW_MS = 1000;
/** How far behind its receipt an Event may be stamped before its timestamp is moved up. */
export const TIMESTAMP_TOLERANCE_MS = 1000;
/** How many Rounds a Participant must win to win the Duel. */
export const ROUNDS_TO_WIN = 2;
/** How many Rounds a Duel has at most: it ends earlier once a Participant has won enough. */
export const MAX_ROUNDS = 3;
/** Between the end of a Round and the Countdown of the next one, while both Results are shown. */
export const ROUND_PAUSE_MS = 5000;
