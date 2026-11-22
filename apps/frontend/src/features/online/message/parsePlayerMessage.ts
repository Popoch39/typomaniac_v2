/** What a Friend's Friends see of them: Online, seated in an unfinished Duel, or offline. */
export type FriendState = "online" | "inDuel" | "offline";

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
  | { readonly type: AboutPlayerType; readonly playerId: string };

const ABOUT_PLAYER_TYPES: readonly unknown[] = [
  "friendRequestReceived",
  "friendRequestSent",
  "friendRequestAccepted",
  "friendRequestRemoved",
  "friendRemoved",
] satisfies AboutPlayerType[];

const FRIEND_STATES: readonly unknown[] = ["online", "inDuel", "offline"] satisfies FriendState[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFriendWithState = (value: unknown) =>
  isRecord(value) && typeof value.playerId === "string" && FRIEND_STATES.includes(value.state);

const isPlayerMessage = (value: unknown): value is PlayerServerMessage => {
  if (!isRecord(value)) return false;
  if (value.type === "onlineCount")
    return Number.isInteger(value.count) && Number(value.count) >= 0;
  if (value.type === "friendStates")
    return Array.isArray(value.friends) && value.friends.every(isFriendWithState);
  if (value.type === "friendState") return isFriendWithState(value);
  return ABOUT_PLAYER_TYPES.includes(value.type) && typeof value.playerId === "string";
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
