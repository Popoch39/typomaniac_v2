import { challengeTimeLeft } from "../clock/challengeClock.ts";
import { useChallengeStore } from "../store/useChallengeStore.ts";

/** The Challenge this tab sent, while it waits for the Friend's answer. */
export function useSentChallenge() {
  const sent = useChallengeStore((state) => state.sent);
  const now = useChallengeStore((state) => state.now);
  const cancel = useChallengeStore((state) => state.cancel);
  // Until the server confirms it, the clock shows the whole time, hidden.
  const timeLeft = sent?.window ? challengeTimeLeft(sent.window, now) : null;
  return {
    nickname: sent?.friend.nickname ?? "",
    timeLeft: timeLeft?.label ?? "1:00",
    share: timeLeft?.share ?? 1,
    isConfirmed: timeLeft !== null,
    cancel,
  };
}
