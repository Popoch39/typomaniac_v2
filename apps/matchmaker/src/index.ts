import { tickMatchmaker } from "@repo/queue";
import { openRedis, requireRedisUrl } from "@repo/redis";
import { startMatchmaker } from "./matchmaker.ts";

const redis = await openRedis(requireRedisUrl());

const matchmaker = startMatchmaker(redis, (now) => tickMatchmaker(redis, now));
console.log("Matchmaker started");

const shutDown = () => {
  matchmaker.stop();
  redis.close();
};
process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
