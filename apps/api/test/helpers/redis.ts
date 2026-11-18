import { openRedis, requireRedisUrl } from "../../src/redis/client.ts";

// Each caller gets its own namespace, so test files never share keys or channels.
export const createTestRedis = async () => {
  const namespace = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const redis = await openRedis(requireRedisUrl(), namespace);

  const drop = async () => {
    const keys: string[] = await redis.client.send("KEYS", [`${namespace}:*`]);
    if (keys.length > 0) await redis.client.del(...keys);
    redis.close();
  };
  return { redis, drop };
};
