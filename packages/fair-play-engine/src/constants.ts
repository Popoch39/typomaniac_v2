const DAY_MS = 24 * 60 * 60 * 1000;

// Starting values (ADR 0014), to be tuned on real Games.
/** How long a Player's first Suspension keeps them out of the Queue. */
export const FIRST_SUSPENSION_MS = 3 * DAY_MS;
/** How long every Suspension after the first keeps them out of the Queue. */
export const LONGER_SUSPENSION_MS = 14 * DAY_MS;
/** How far back a Suspension or a Ban voids the ranked Duels the Player won (ADR 0015). */
export const REPAIR_WINDOW_MS = 14 * DAY_MS;
