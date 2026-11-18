// Opening Redis is shared with the matchmaker; this file stays the place the API imports it from.
export { openRedis, requireRedisUrl, type Redis } from "@repo/redis";
