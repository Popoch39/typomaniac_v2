import type { QueueServerMessage } from "@repo/matchmaking-engine";

/** Whether a value read from JSON has the expected shape. */
type Check = (value: unknown) => boolean;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNumber: Check = (value) => typeof value === "number" && Number.isFinite(value);

// What each type of message must carry, as the server's schemas send it.
const FIELDS: Record<QueueServerMessage["type"], Record<string, Check>> = {
  queued: { queuedAt: isNumber, serverAt: isNumber },
  removed: { reason: (value) => value === "replaced" },
};

const isMessageType = (type: unknown): type is QueueServerMessage["type"] =>
  typeof type === "string" && Object.hasOwn(FIELDS, type);

const isQueueMessage = (value: unknown): value is QueueServerMessage =>
  isRecord(value) &&
  isMessageType(value.type) &&
  Object.entries(FIELDS[value.type]).every(([key, check]) => check(value[key]));

/**
 * The message a frame from the Queue socket carries, `null` for a frame that is not one: a client
 * never acts on what it cannot read.
 */
export function parseQueueMessage(frame: string): QueueServerMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(frame);
  } catch {
    return null;
  }
  return isQueueMessage(value) ? value : null;
}
