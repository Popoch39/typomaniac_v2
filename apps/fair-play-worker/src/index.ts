import { openDatabase, requireDatabaseUrl } from "@repo/db";
import { runFairPlayPass } from "@repo/fair-play";
import { getLogger, setupLogger } from "@repo/logger";
import { startFairPlayWorker } from "./worker.ts";

await setupLogger();
const logger = getLogger("fair-play-worker");

// The API migrates the database (ADR 0002): the worker only opens it.
const db = openDatabase(requireDatabaseUrl());

const worker = startFairPlayWorker(db, (now) => runFairPlayPass(db, now), logger);
logger.info("Fair-play worker started");

const shutDown = async () => {
  await worker.stop();
  await db.$client.close();
  logger.info("Fair-play worker stopped");
};
process.on("SIGINT", () => void shutDown());
process.on("SIGTERM", () => void shutDown());
