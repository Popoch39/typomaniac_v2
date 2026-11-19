import type { Redis } from "../../redis/client.ts";

// Increments the counter and starts its window in one step, so a crash between the two cannot
// leave a counter that never expires.
const consumeScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('TTL', KEYS[1]) }
`;

/**
 * Counts one more request against `key` in a fixed window of `windowSeconds`, in Redis so that
 * every API instance shares the count. Gives the count so far and the seconds left in the window.
 */
export const consumeWindow = async (redis: Redis, key: string, windowSeconds: number) => {
  const [count, secondsLeft]: [number, number] = await redis.client.send("EVAL", [
    consumeScript,
    "1",
    key,
    String(windowSeconds),
  ]);
  return { count, secondsLeft };
};

/** What the running server knows of a request's connection; absent when a request is handled in process. */
export type SocketSource = {
  requestIP(request: Request): { readonly address: string } | null;
} | null;

/**
 * The address a request comes from: the socket's, or the leftmost X-Forwarded-For entry when the
 * API is told it runs behind a proxy. Null when neither is known.
 */
export const resolveClientIp = (
  request: Request,
  server: SocketSource,
  trustProxy: boolean,
): string | null => {
  if (trustProxy) {
    // The proxy appends the address it saw, so the leftmost one is the client's as the first proxy saw it.
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }
  return server?.requestIP(request)?.address ?? null;
};
