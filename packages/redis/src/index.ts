import { RedisClient } from "bun";

export const requireRedisUrl = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set: copy the app's .env.example to .env in its folder");
  }
  return url;
};

// Every key and channel is named under a namespace, so test files sharing one Redis never see each other's.
export const openRedis = async (url: string, namespace = "typomaniac") => {
  const client = new RedisClient(url);
  await client.connect();
  // A client that subscribes can no longer send other commands: the subscriber needs its own connection.
  const subscriber = await client.duplicate();
  return {
    client,
    subscriber,
    name: (...parts: string[]) => [namespace, ...parts].join(":"),
    close: () => {
      subscriber.close();
      client.close();
    },
  };
};

export type Redis = Awaited<ReturnType<typeof openRedis>>;
