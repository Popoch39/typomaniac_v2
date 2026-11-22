import { isTierChoice, type Ornament, type Rank } from "@repo/ranked-engine";

/** What a Friend's Friends see of them: Online, seated in an unfinished Duel, or offline. */
export type FriendState = "online" | "inDuel" | "offline";

/** Why a Challenge was not sent. */
export type ChallengeRefusal =
  | "NOT_FRIENDS"
  | "FRIEND_OFFLINE"
  | "CHALLENGE_PENDING"
  | "RATE_LIMITED";

/** The Friend who challenged, as the Leaderboard shows them. */
export type Challenger = {
  readonly id: string;
  readonly nickname: string;
  readonly avatarUrl: string | null;
  /** Null while Unranked. */
  readonly rank: Rank | null;
  readonly ornament: Ornament;
};

/** The messages about a Challenge that carry nothing else. */
type AboutChallengeType = "challengeAnsweredElsewhere" | "challengeCancelled" | "challengeExpired";

/** The messages that name another Player, whose Friend request or Friendship with this one changed. */
type AboutPlayerType =
  | "friendRequestReceived"
  | "friendRequestSent"
  | "friendRequestAccepted"
  | "friendRequestRemoved"
  | "friendRemoved";

/** What the Player socket sends, as the server's schemas send it. */
export type PlayerServerMessage =
  | { readonly type: "onlineCount"; readonly count: number }
  | {
      readonly type: "friendStates";
      readonly friends: readonly { readonly playerId: string; readonly state: FriendState }[];
    }
  | { readonly type: "friendState"; readonly playerId: string; readonly state: FriendState }
  | { readonly type: AboutPlayerType; readonly playerId: string }
  | {
      readonly type: "challengeSent";
      readonly challengeId: string;
      readonly playerId: string;
      readonly answerWithinMs: number;
    }
  | {
      readonly type: "challengeRefused";
      readonly playerId: string;
      readonly code: ChallengeRefusal;
    }
  | {
      readonly type: "challengeReceived";
      readonly challengeId: string;
      readonly challenger: Challenger;
      readonly answerWithinMs: number;
    }
  | { readonly type: "challengeAccepted"; readonly challengeId: string; readonly duelId: string }
  | { readonly type: "challengeDeclined"; readonly challengeId: string; readonly playerId: string }
  | { readonly type: AboutChallengeType; readonly challengeId: string };

const ABOUT_PLAYER_TYPES: readonly unknown[] = [
  "friendRequestReceived",
  "friendRequestSent",
  "friendRequestAccepted",
  "friendRequestRemoved",
  "friendRemoved",
] satisfies AboutPlayerType[];

const FRIEND_STATES: readonly unknown[] = ["online", "inDuel", "offline"] satisfies FriendState[];

const CHALLENGE_REFUSALS: readonly unknown[] = [
  "NOT_FRIENDS",
  "FRIEND_OFFLINE",
  "CHALLENGE_PENDING",
  "RATE_LIMITED",
] satisfies ChallengeRefusal[];

const ABOUT_CHALLENGE_TYPES: readonly unknown[] = [
  "challengeAnsweredElsewhere",
  "challengeCancelled",
  "challengeExpired",
] satisfies AboutChallengeType[];

const DIVISIONS: readonly unknown[] = [1, 2, 3, 4];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown) => typeof value === "string";

const isTimeLeft = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;

const isRank = (value: unknown) => {
  if (!isRecord(value) || !Number.isInteger(value.lp)) return false;
  if (value.tier === "master") return true;
  return isTierChoice(value.tier) && DIVISIONS.includes(value.division);
};

const isOrnament = (value: unknown) =>
  isRecord(value) &&
  (value.tier === "unranked" || isTierChoice(value.tier)) &&
  (value.division === null || DIVISIONS.includes(value.division));

// `null` values are sent, never left out.
const isChallenger = (value: unknown) =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.nickname) &&
  (value.avatarUrl === null || isString(value.avatarUrl)) &&
  (value.rank === null || isRank(value.rank)) &&
  (value.ornament === null || isOrnament(value.ornament));

const isChallengeMessage = (value: Record<string, unknown>) => {
  if (!isString(value.challengeId)) return false;
  switch (value.type) {
    case "challengeSent":
      return isString(value.playerId) && isTimeLeft(value.answerWithinMs);
    case "challengeReceived":
      return isChallenger(value.challenger) && isTimeLeft(value.answerWithinMs);
    case "challengeAccepted":
      return isString(value.duelId);
    case "challengeDeclined":
      return isString(value.playerId);
    default:
      return ABOUT_CHALLENGE_TYPES.includes(value.type);
  }
};

const isFriendWithState = (value: unknown) =>
  isRecord(value) && typeof value.playerId === "string" && FRIEND_STATES.includes(value.state);

const isPlayerMessage = (value: unknown): value is PlayerServerMessage => {
  if (!isRecord(value)) return false;
  if (value.type === "onlineCount")
    return Number.isInteger(value.count) && Number(value.count) >= 0;
  if (value.type === "friendStates")
    return Array.isArray(value.friends) && value.friends.every(isFriendWithState);
  if (value.type === "friendState") return isFriendWithState(value);
  if (value.type === "challengeRefused")
    return isString(value.playerId) && CHALLENGE_REFUSALS.includes(value.code);
  if (ABOUT_PLAYER_TYPES.includes(value.type)) return isString(value.playerId);
  return isChallengeMessage(value);
};

/**
 * The message a frame from the Player socket carries, `null` for a frame that is not one: a client
 * never acts on what it cannot read.
 */
export function parsePlayerMessage(frame: string): PlayerServerMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(frame);
  } catch {
    return null;
  }
  return isPlayerMessage(value) ? value : null;
}
