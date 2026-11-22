import { useChallengeStore } from "../store/useChallengeStore.ts";

export function useChallengeNotice() {
  const notice = useChallengeStore((state) => state.notice);
  const dismiss = useChallengeStore((state) => state.dismiss);
  return { notice: notice ?? "", dismiss };
}
