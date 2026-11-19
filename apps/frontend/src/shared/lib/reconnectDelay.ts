/** The close codes after which the server may be back: a restart (1012) or a dropped connection (1006). */
const RETRIED_CODES = new Set([1006, 1012]);
const FIRST_DELAY_MS = 500;
// Doubling from half a second, the last try comes about 15 s after the close.
const MAX_ATTEMPTS = 5;

/**
 * The delay before the `attempt`-th try to reopen a socket that closed with `code`, counted from 1,
 * or `null` when it is not tried again. Any other code is a deliberate closing by the server.
 */
export function reconnectDelay(code: number, attempt: number) {
  if (!RETRIED_CODES.has(code) || attempt > MAX_ATTEMPTS) return null;
  return FIRST_DELAY_MS * 2 ** (attempt - 1);
}
