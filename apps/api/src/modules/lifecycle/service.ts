import { sql } from "drizzle-orm";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { CloseCode } from "./closeCode.ts";

/** How long Postgres and Redis have to answer a readiness check before the instance counts as not ready. */
export const READY_TIMEOUT_MS = 1000;

export const isReady = async (db: Db, redis: Redis, timeoutMs = READY_TIMEOUT_MS) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  const checks = Promise.all([db.execute(sql`select 1`), redis.client.ping()]).then(
    () => true,
    () => false,
  );
  try {
    return await Promise.race([checks, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

type Socket = {
  readonly close: (code?: number, reason?: string) => void;
  readonly readyState: number;
};

const CLOSED = 3;

/**
 * What this API instance knows of its own stop: whether it began, and the sockets it holds, which it
 * closes before it stops.
 */
export const createLifecycle = () => {
  let stopping = false;
  const open = new Map<string, Socket>();

  return {
    isStopping: () => stopping,
    beginStopping: () => {
      stopping = true;
    },
    /**
     * Holds a socket that has just opened, until `release`. Refused while the instance stops: the
     * socket is closed as the ones open before the stop were, and its opening must go no further.
     */
    hold: (id: string, socket: Socket) => {
      if (stopping) {
        socket.close(CloseCode.serviceRestart, "service restart");
        return false;
      }
      open.set(id, socket);
      return true;
    },
    release: (id: string) => {
      open.delete(id);
    },
    /**
     * Closes every socket held, so that its client reconnects to another instance. Resolves the
     * count once all are closed: Elysia sends the close frame only after the close handler has run,
     * and `app.stop()` would cut a socket still closing without its code.
     */
    closeSockets: async () => {
      const held = [...open.values()];
      for (const socket of held) socket.close(CloseCode.serviceRestart, "service restart");
      while (held.some((socket) => socket.readyState !== CLOSED)) await Bun.sleep(1);
      return held.length;
    },
  };
};

export type Lifecycle = ReturnType<typeof createLifecycle>;
