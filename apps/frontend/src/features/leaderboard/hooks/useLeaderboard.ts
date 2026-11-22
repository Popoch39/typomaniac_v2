import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { type ReadyData, readGate, readStage, retryFailed } from "../../../shared/api/readStage.ts";
import { useSession } from "../../auth/hooks/useSession.ts";
import { useLeaderboardAddFriendTargets } from "../../friends/hooks/useLeaderboardAddFriendTargets.ts";
import { leaderboardQueryOptions } from "../api/leaderboardQueryOptions.ts";
import { pageToReplace } from "../page/pageToReplace.ts";

export type Leaderboard = ReadyData<ReturnType<typeof useLeaderboard>["gate"]>;

export type LeaderboardPlayer = Leaderboard["podium"][number];

/**
 * The page of the Leaderboard the URL asks for, and the page the URL must be replaced by when the
 * server served another one. The page shown stays until the next one is read, so that turning a page
 * never blanks the Leaderboard. The signed-in Player's relation to the page's Players is read beside
 * it, behind the same gate, so that the Add Friend keys are drawn with the rows. The session is waited
 * on, as it decides whether there are keys at all, but its failure only leaves them out; the skeleton
 * drops "Your position" once the reader is known to be a Guest.
 */
export function useLeaderboard() {
  const { page } = useSearch({ from: "/_shell/leaderboard" });
  const { session } = useSession();
  const read = useQuery({ ...leaderboardQueryOptions(page), placeholderData: keepPreviousData });
  const { data, isPlaceholderData } = read;
  const { targetOf, isSessionChecking, relations } = useLeaderboardAddFriendTargets(
    page,
    isPlaceholderData,
  );
  const reads = relations === null ? [read] : [read, relations];
  const error = reads.find((each) => each.error !== null)?.error ?? null;
  const stage = readStage(reads);
  return {
    gate: readGate(
      stage === "ready" && isSessionChecking ? "loading" : stage,
      data,
      error === null ? null : describeApiError(error),
      () => retryFailed(reads),
    ),
    addFriendOf: targetOf,
    isGuest: session.kind === "guest",
    replacingPage:
      data === undefined
        ? null
        : pageToReplace(page, { page: data.page, isPlaceholder: isPlaceholderData }),
  };
}
