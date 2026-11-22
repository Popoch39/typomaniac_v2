import type { FriendState, PlayerServerMessage } from "../../online/message/parsePlayerMessage.ts";

/** Each Friend's state by their id, as the Player socket told it. */
export type FriendStates = Readonly<Record<string, FriendState>>;

/**
 * The Friends' states once the message is taken into account: replaced by those told on opening,
 * changed one at a time after that, a removed Friend's forgotten. `null` until anything is told.
 */
export function nextFriendStates(
  states: FriendStates | null,
  message: PlayerServerMessage,
): FriendStates | null {
  switch (message.type) {
    case "friendStates":
      return Object.fromEntries(message.friends.map(({ playerId, state }) => [playerId, state]));
    case "friendState":
      return { ...states, [message.playerId]: message.state };
    case "friendRemoved": {
      if (states === null) return null;
      const { [message.playerId]: _removed, ...others } = states;
      return others;
    }
    default:
      return states;
  }
}

/** Every label a state takes, so that its box keeps the size of the longest. */
export const FRIEND_STATE_LABELS = ["Online", "In a Duel", "Offline"] as const;

/** How the Player reads a Friend's state; one never told of is offline until told otherwise. */
export function friendStateLabel(
  state: FriendState | undefined,
): (typeof FRIEND_STATE_LABELS)[number] {
  switch (state) {
    case "online":
      return "Online";
    case "inDuel":
      return "In a Duel";
    default:
      return "Offline";
  }
}
