import { getLogger, setupLogger } from "@repo/logger";
import { tickMatchmaker } from "@repo/queue";
import { openRedis, requireRedisUrl } from "@repo/redis";
import { startMatchmaker } from "./matchmaker.ts";

await setupLogger();
const logger = getLogger("matchmaker");

const redis = await openRedis(requireRedisUrl());

const matchmaker = startMatchmaker(redis, (now) => tickMatchmaker(redis, now), logger);
logger.info("Matchmaker started");

const shutDown = () => {
  matchmaker.stop();
  redis.close();
  logger.info("Matchmaker stopped");
};
process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
