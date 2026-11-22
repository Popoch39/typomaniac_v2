import type { FriendState } from "../../online/message/parsePlayerMessage.ts";
import { useChallengeStore } from "../store/useChallengeStore.ts";

/** Every label of the key, so that it keeps the size of the longest. */
export const CHALLENGE_LABELS = ["Challenge", "Waiting…"] as const;

/** Challenging a Friend from their row: only an Online one, and one Challenge at a time. */
export function useChallengeKey(friend: { id: string; nickname: string }, state: FriendState) {
  const sentTo = useChallengeStore((store) => store.sent?.friend.id ?? null);
  const challenge = useChallengeStore((store) => store.challenge);
  return {
    label: sentTo === friend.id ? CHALLENGE_LABELS[1] : CHALLENGE_LABELS[0],
    disabled: state !== "online" || sentTo !== null,
    challenge: () => challenge({ id: friend.id, nickname: friend.nickname }),
  };
}
