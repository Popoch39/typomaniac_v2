import { FIRST_SUSPENSION_MS, LONGER_SUSPENSION_MS } from "./constants.ts";

/**
 * CONFIG-1: how long a Suspension keeps the Player out of the Queue, given how many Suspensions they
 * were given before it and that still hold, revoked ones left out.
 */
export const suspensionLength = (earlierSuspensions: number) =>
  earlierSuspensions === 0 ? FIRST_SUSPENSION_MS : LONGER_SUSPENSION_MS;
