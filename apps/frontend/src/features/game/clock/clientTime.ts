/** The current instant on this client's clock, in epoch milliseconds. */
export function clientTime() {
  // Monotonic and sub-millisecond, in epoch milliseconds so a server can bound it against receipt.
  return performance.timeOrigin + performance.now();
}
