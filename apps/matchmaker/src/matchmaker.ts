import type { Redis } from "@repo/redis";

// Takes the lock when it is free and extends it when this matchmaker already holds it, in one step:
// two matchmakers asking at the same moment can never both be told they lead.
const LEAD = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  return 1
end
if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then return 1 end
return 0
`;

export type Tick = (now: number) => void | Promise<void>;

export type MatchmakerOptions = {
  tickMs?: number;
  // Several ticks long, so that a leader that is merely slow keeps its lock.
  lockMs?: number;
};

export const startMatchmaker = (
  redis: Redis,
  tick: Tick,
  { tickMs = 1000, lockMs = 5000 }: MatchmakerOptions = {},
) => {
  const lockKey = redis.name("matchmaker", "leader");
  const holder = crypto.randomUUID();
  let stopped = false;
  let beating = false;

  const beat = async () => {
    // A beat slower than the interval is not doubled: two ticks of one matchmaker never overlap.
    if (beating) return;
    beating = true;
    try {
      const leads: number = await redis.client.eval(LEAD, 1, lockKey, holder, lockMs);
      if (leads === 1 && !stopped) await tick(Date.now());
    } catch (error) {
      // Redis going away must not end the process: the next beat tries again once it is back.
      console.error("Matchmaker beat failed", error);
    } finally {
      beating = false;
    }
  };

  const timer = setInterval(() => void beat(), tickMs);
  void beat();

  return {
    // The lock is left to expire rather than released: a stopped leader and a crashed one hand over the same way.
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
};
