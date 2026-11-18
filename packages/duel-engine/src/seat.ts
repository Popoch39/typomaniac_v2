import type { Seat } from "./messages.ts";

/** The seat of the Opponent of the Participant sitting on `seat`. */
export const opponentSeat = (seat: Seat): Seat => (seat === 0 ? 1 : 0);
