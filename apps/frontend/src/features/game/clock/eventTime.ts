/** The instant an Event happens, in epoch milliseconds. */
export function eventTime() {
  // Monotonic and sub-millisecond, in epoch milliseconds so a server can bound it against receipt.
  return performance.timeOrigin + performance.now();
}
