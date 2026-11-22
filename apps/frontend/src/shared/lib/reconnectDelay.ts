/** The WebSocket close codes the client acts on, named once (RFC 6455, section 7.4.1). */
export const CloseCode = {
  /** The server closed the socket having nothing more for it. */
  normal: 1000,
  /** The connection dropped without a close frame. */
  abnormal: 1006,
  /** The server closed the socket for something the client did, such as flooding it. */
  policyViolation: 1008,
  /** The server instance stops, not for anything the client did. */
  serviceRestart: 1012,
} as const;

/** The close codes after which the server may be back. */
const RETRIED_CODES = new Set<number>([CloseCode.abnormal, CloseCode.serviceRestart]);
const FIRST_DELAY_MS = 500;
// Doubling from half a second, the last try comes about 15 s after the close.
const MAX_ATTEMPTS = 5;

const backoff = (attempt: number) => FIRST_DELAY_MS * 2 ** (attempt - 1);

/**
 * The delay before the `attempt`-th try to reopen a socket that closed with `code`, counted from 1,
 * or `null` when it is not tried again. Any other code is a deliberate closing by the server.
 */
export function reconnectDelay(code: number, attempt: number) {
  if (!RETRIED_CODES.has(code) || attempt > MAX_ATTEMPTS) return null;
  return backoff(attempt);
}

/** The close codes a server sends only on purpose: anything else may come from a proxy or a crash. */
const FINAL_CODES = new Set<number>([CloseCode.normal, CloseCode.policyViolation]);
const MAX_DELAY_MS = 30_000;

/**
 * Like `reconnectDelay`, with no last try and the delay capped at 30 s, for a socket that must
 * come back however long the server was down: only a closing the server made on purpose is final.
 */
export function endlessReconnectDelay(code: number, attempt: number) {
  if (FINAL_CODES.has(code)) return null;
  return Math.min(backoff(attempt), MAX_DELAY_MS);
}
