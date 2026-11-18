import { openRedis, requireRedisUrl } from "@repo/redis";
import { startMatchmaker } from "./matchmaker.ts";

const redis = await openRedis(requireRedisUrl());

// Nothing to pair yet: the Queue does not exist. The tick only proves this process leads.
const matchmaker = startMatchmaker(redis, () => {});
console.log("Matchmaker started");

const shutDown = () => {
  matchmaker.stop();
  redis.close();
};
process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
