import type { FriendStates } from "./friendStates.ts";

// The Friends a Player can challenge now first, then those who will be free once their Duel ends.
const RANK = { online: 0, inDuel: 1, offline: 2 } as const;

/** The Friends with the Online ones first, then those In a Duel, then the offline ones, each keeping its order. */
export function orderFriends<Friend extends { readonly id: string }>(
  friends: readonly Friend[],
  states: FriendStates | null,
): Friend[] {
  const rankOf = ({ id }: Friend) => RANK[states?.[id] ?? "offline"];
  return [...friends].sort((one, other) => rankOf(one) - rankOf(other));
}
