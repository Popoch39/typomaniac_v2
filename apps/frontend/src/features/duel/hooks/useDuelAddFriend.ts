import { useAddFriendTargets } from "../../friends/hooks/useAddFriendTargets.ts";
import { useDuelParticipants } from "./useDuelParticipants.ts";

/** The Add Friend key on the Opponent, when they are a Player: a Guest is never looked up. */
export function useDuelAddFriend() {
  const { opponent } = useDuelParticipants();
  const name = opponent === undefined || opponent.guest ? null : opponent.name;
  const { targetOf, hasLookup } = useAddFriendTargets([name]);
  return { target: targetOf(name), reserve: hasLookup };
}
