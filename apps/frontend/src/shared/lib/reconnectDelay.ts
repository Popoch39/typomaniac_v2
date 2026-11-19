/** The WebSocket close codes the client acts on, named once (RFC 6455, section 7.4.1). */
export const CloseCode = {
  /** The connection dropped without a close frame. */
  abnormal: 1006,
  /** The server instance stops, not for anything the client did. */
  serviceRestart: 1012,
} as const;

/** The close codes after which the server may be back. */
const RETRIED_CODES = new Set<number>([CloseCode.abnormal, CloseCode.serviceRestart]);
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
