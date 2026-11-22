import { useChallengeStore } from "../store/useChallengeStore.ts";

export function useChallengeLayer() {
  const received = useChallengeStore((state) => state.received);
  const hasSent = useChallengeStore((state) => state.sent !== null);
  const hasNotice = useChallengeStore((state) => state.notice !== null);
  return { received, hasSent, hasNotice };
}
