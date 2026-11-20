import { useState } from "react";
import { describeApiError } from "../../../shared/api/describeApiError.ts";

// Long enough to see the skeleton come back, as it does while a real read is tried again.
const RETRY_MS = 1500;

/** The Leaderboard's error forced on, whose "Try again" plays the skeleton before failing again. */
export function useDevLeaderboardStates() {
  const [isRetrying, setIsRetrying] = useState(false);
  return {
    failure: describeApiError(null),
    isRetrying,
    retry: () => {
      setIsRetrying(true);
      setTimeout(() => setIsRetrying(false), RETRY_MS);
    },
  };
}
