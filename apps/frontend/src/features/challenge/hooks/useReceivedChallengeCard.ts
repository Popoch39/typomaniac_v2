import { challengeTimeLeft } from "../clock/challengeClock.ts";
import type { ReceivedChallenge } from "../outcome/nextChallenges.ts";
import { useChallengeStore } from "../store/useChallengeStore.ts";

/** Every label of the accept key, so that it keeps the size of the longest. */
export const ACCEPT_LABELS = ["Accept", "Accepting…"] as const;

export function useReceivedChallengeCard({ challengeId, window, isAccepting }: ReceivedChallenge) {
  const now = useChallengeStore((state) => state.now);
  const accept = useChallengeStore((state) => state.accept);
  const decline = useChallengeStore((state) => state.decline);
  const timeLeft = challengeTimeLeft(window, now);
  return {
    timeLeft: timeLeft.label,
    share: timeLeft.share,
    acceptLabel: isAccepting ? ACCEPT_LABELS[1] : ACCEPT_LABELS[0],
    isAccepting,
    accept: () => accept(challengeId),
    decline: () => decline(challengeId),
  };
}
