import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { isTierChoice } from "@repo/ranked-engine";

/** Whether a value read from JSON has the expected shape. */
type Check = (value: unknown) => boolean;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNumber: Check = (value) => typeof value === "number" && Number.isFinite(value);
const isString: Check = (value) => typeof value === "string";
const isNullOr =
  (isValue: Check): Check =>
  (value) =>
    value === null || isValue(value);
const hasFields = (value: unknown, checks: Record<string, Check>) =>
  isRecord(value) && Object.entries(checks).every(([key, check]) => check(value[key]));

const DIVISIONS = [1, 2, 3, 4];

const isRank: Check = (value) => {
  if (!isRecord(value) || !Number.isInteger(value.lp)) return false;
  if (value.tier === "master") return true;
  return isTierChoice(value.tier) && DIVISIONS.includes(Number(value.division));
};

const isOrnament: Check = (value) =>
  hasFields(value, {
    tier: (tier) => tier === "unranked" || isTierChoice(tier),
    division: (division) => division === null || DIVISIONS.includes(Number(division)),
  });

const isPairingSide: Check = (value) =>
  hasFields(value, {
    nickname: isString,
    // `null` values are sent, never left out.
    avatarUrl: (avatarUrl) => avatarUrl !== undefined && isNullOr(isString)(avatarUrl),
    rank: (rank) => rank !== undefined && isNullOr(isRank)(rank),
    ornament: (ornament) => ornament !== undefined && isNullOr(isOrnament)(ornament),
  });

// What each type of message must carry, as the server's schemas send it.
const FIELDS: Record<QueueServerMessage["type"], Record<string, Check>> = {
  queued: { queuedAt: isNumber, serverAt: isNumber },
  proposed: {
    pairingId: isString,
    acceptWithinMs: isNumber,
    accepted: (accepted) => typeof accepted === "boolean",
    players: (players) => hasFields(players, { self: isPairingSide, opponent: isPairingSide }),
  },
  requeued: { queuedAt: isNumber, serverAt: isNumber },
  removed: { reason: (value) => value === "replaced" || value === "notAccepted" },
  paired: { duelId: isString },
};

const isMessageType = (type: unknown): type is QueueServerMessage["type"] =>
  typeof type === "string" && Object.hasOwn(FIELDS, type);

const isQueueMessage = (value: unknown): value is QueueServerMessage =>
  isRecord(value) && isMessageType(value.type) && hasFields(value, FIELDS[value.type]);

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
