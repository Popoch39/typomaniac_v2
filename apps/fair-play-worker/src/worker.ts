import { type Db, leaderLease } from "@repo/db";
import type { Logger } from "@repo/logger";
import { eq, lt, or, sql } from "drizzle-orm";

export type Pass = (now: number) => void | Promise<void>;

export type FairPlayWorkerOptions = {
  passMs?: number;
  // Several passes long, so that a leader that is merely slow keeps its lock.
  lockMs?: number;
};

const LEASE_NAME = "fair-play-worker";

// Takes the lease when it is free or expired and renews it when this worker already holds it, in one
// statement against the database's clock: two workers asking at the same moment can never both lead.
const lead = async (db: Db, holder: string, lockMs: number) => {
  const expiresAt = sql`now() + ${lockMs}::integer * interval '1 millisecond'`;
  const led = await db
    .insert(leaderLease)
    .values({ name: LEASE_NAME, holder, expiresAt })
    .onConflictDoUpdate({
      target: leaderLease.name,
      set: { holder, expiresAt },
      setWhere: or(eq(leaderLease.holder, holder), lt(leaderLease.expiresAt, sql`now()`)),
    })
    .returning({ holder: leaderLease.holder });
  return led.length === 1;
};

/**
 * Runs the fair-play pass every `passMs`, given the current instant, while this worker holds the
 * leader lock, so that a second worker started by mistake waits instead of passing alongside it.
 */
export const startFairPlayWorker = (
  db: Db,
  pass: Pass,
  logger: Logger,
  { passMs = 5000, lockMs = 30_000 }: FairPlayWorkerOptions = {},
) => {
  const holder = crypto.randomUUID();
  let stopped = false;
  let beating: Promise<void> | null = null;

  const beat = async () => {
    try {
      if ((await lead(db, holder, lockMs)) && !stopped) await pass(Date.now());
    } catch (error) {
      // The database going away must not end the process: the next beat tries again once it is back.
      logger.error("Fair-play pass failed", { error });
    }
  };

  const tick = () => {
    // A beat slower than the interval is not doubled: two passes of one worker never overlap.
    if (beating) return;
    beating = beat().finally(() => {
      beating = null;
    });
  };

  const timer = setInterval(tick, passMs);
  tick();

  return {
    // The lock is left to expire rather than released: a stopped leader and a crashed one hand over
    // the same way. Resolves once a pass under way has ended, so that the database can be closed.
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await beating;
    },
  };
};
