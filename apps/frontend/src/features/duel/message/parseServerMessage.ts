import type { ServerMessage } from "@repo/duel-engine";

/** Whether a value read from JSON has the expected shape. */
type Check = (value: unknown) => boolean;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNumber: Check = (value) => typeof value === "number" && Number.isFinite(value);
const isString: Check = (value) => typeof value === "string";
const isBoolean: Check = (value) => typeof value === "boolean";
const isSeat: Check = (value) => value === 0 || value === 1;
// Rounds are numbered from 1.
const isRound: Check = (value) => Number.isInteger(value) && Number(value) >= 1;
const isOutcome: Check = (value) => value === "win" || value === "loss" || value === "draw";

const isListOf =
  (isItem: Check): Check =>
  (value) =>
    Array.isArray(value) && value.every((item) => isItem(item));
const isPairOf =
  (isItem: Check): Check =>
  (value) =>
    isListOf(isItem)(value) && Array.isArray(value) && value.length === 2;
const isNullOr =
  (isValue: Check): Check =>
  (value) =>
    value === null || isValue(value);
const hasFields = (value: unknown, checks: Record<string, Check>) =>
  isRecord(value) && Object.entries(checks).every(([key, check]) => check(value[key]));

const isNumbers = isListOf(isNumber);

const isOrnament: Check = (value) =>
  hasFields(value, {
    tier: (tier) =>
      ["unranked", "bronze", "silver", "gold", "platinum", "diamond", "master"].includes(
        String(tier),
      ),
    // `null` for the Unranked plate, a Master Ornament or a pinned Tier, but never left out.
    division: (division) => division === null || [1, 2, 3, 4].includes(Number(division)),
  });

const isParticipant: Check = (value) =>
  hasFields(value, {
    seat: isSeat,
    name: isString,
    // `null` for a Guest, but never left out.
    avatarUrl: (avatarUrl) => avatarUrl !== undefined && isNullOr(isString)(avatarUrl),
    ornament: (ornament) => ornament !== undefined && isNullOr(isOrnament)(ornament),
    connected: isBoolean,
  });

const isGameEvent: Check = (value) => {
  if (!isRecord(value)) return false;
  if (value.type === "addWords") return isListOf(isString)(value.words);
  if (!isNumber(value.at)) return false;
  if (value.type === "start" || value.type === "tick") return true;
  if (value.type === "keyDown" || value.type === "keyUp") return isString(value.code);
  if (value.type === "insert") return isString(value.text);
  if (value.type === "delete") return value.unit === "char" || value.unit === "word";
  return false;
};

const isResult: Check = (value) =>
  hasFields(value, {
    duration: isNumber,
    wpm: isNumber,
    rawWpm: isNumber,
    accuracy: isNumber,
    charCounts: (counts) =>
      hasFields(counts, {
        correct: isNumber,
        incorrect: isNumber,
        extra: isNumber,
        missed: isNumber,
        exactWords: isNumber,
      }),
    consistency: isNumber,
    history: (history) =>
      hasFields(history, { wpm: isNumbers, keystrokeRate: isNumbers, errors: isNumbers }),
    keyPressGaps: isNumbers,
    keyHoldDurations: isNumbers,
    keyConsistency: isNumber,
    inactiveSeconds: isNumber,
    inactiveAtEnd: isBoolean,
  });

const isFinishedRound: Check = (value) =>
  hasFields(value, { results: isPairOf(isResult), outcomes: isPairOf(isOutcome) });

const isRank: Check = (value) => {
  if (!isRecord(value) || !Number.isInteger(value.lp)) return false;
  if (value.tier === "master") return true;
  return (
    ["bronze", "silver", "gold", "platinum", "diamond"].includes(String(value.tier)) &&
    [1, 2, 3, 4].includes(Number(value.division))
  );
};

const isRankedEnd: Check = (value) =>
  hasFields(value, {
    lpDelta: (lpDelta) => Number.isInteger(lpDelta),
    rankChange: (change) =>
      change === "placed" || change === "promoted" || change === "demoted" || change === "none",
    rank: isNullOr(isRank),
    placement: (placement) => hasFields(placement, { played: isNumber, total: isNumber }),
  });

// What each type of message must carry, as the server's schemas send it.
const FIELDS: Record<ServerMessage["type"], Record<string, Check>> = {
  pong: { clientAt: isNumber, serverAt: isNumber },
  state: {
    seat: isSeat,
    round: isRound,
    rounds: isListOf(isFinishedRound),
    startAt: isNullOr(isNumber),
    words: isNullOr(isListOf(isString)),
    participants: isListOf(isParticipant),
    // `null` for a Custom Duel, but never left out.
    ranks: (ranks) => ranks !== undefined && isNullOr(isPairOf(isNullOr(isRank)))(ranks),
    journals: isPairOf(isListOf(isGameEvent)),
  },
  presence: { participant: isParticipant },
  countdown: { round: isRound, startAt: isNumber, words: isListOf(isString) },
  opponentEvent: { event: isGameEvent },
  roundEnd: {
    round: isRound,
    results: isPairOf(isResult),
    outcomes: isPairOf(isOutcome),
    nextStartAt: isNullOr(isNumber),
  },
  end: {
    outcomes: isPairOf(isOutcome),
    rounds: isListOf(isFinishedRound),
    // `null` for a Custom Duel, but never left out.
    ranked: (ranked) => ranked !== undefined && isNullOr(isPairOf(isRankedEnd))(ranked),
  },
};

const isMessageType = (type: unknown): type is ServerMessage["type"] =>
  typeof type === "string" && Object.hasOwn(FIELDS, type);

const isServerMessage = (value: unknown): value is ServerMessage =>
  isRecord(value) && isMessageType(value.type) && hasFields(value, FIELDS[value.type]);

/**
 * The message a frame from the server carries, `null` for a frame that is not one: a client never
 * acts on what it cannot read.
 */
export function parseServerMessage(frame: string): ServerMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(frame);
  } catch {
    return null;
  }
  return isServerMessage(value) ? value : null;
}
