import { useAddFriendTargets } from "../../friends/hooks/useAddFriendTargets.ts";
import { useDuelParticipants } from "./useDuelParticipants.ts";

/**
 * The Add Friend key on the Opponent, when they are a Player: a Guest's name holds a space, which no
 * Nickname does, so it is never looked up.
 */
export function useDuelAddFriend() {
  const { opponent } = useDuelParticipants();
  const name = opponent?.name ?? null;
  const { targetOf, hasLookup } = useAddFriendTargets([name]);
  return { target: targetOf(name), reserve: hasLookup };
}
