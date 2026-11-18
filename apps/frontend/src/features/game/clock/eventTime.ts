import { clientTime } from "./clientTime.ts";

// Owned by the module because every Event of the one Game on screen is stamped on the same clock.
let shift = 0;

/** Stamps the Events to come on a clock `ms` ahead of this client's: the one their Game runs on. */
export function shiftEventTime(ms: number) {
  shift = ms;
}

/** The instant an Event happens, in epoch milliseconds, on the clock of its Game. */
export function eventTime() {
  return clientTime() + shift;
}
