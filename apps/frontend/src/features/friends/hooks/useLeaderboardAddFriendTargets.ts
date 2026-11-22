import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "../../auth/hooks/useSession.ts";
import { leaderboardRelationsQueryOptions } from "../api/leaderboardRelationsQueryOptions.ts";
import { addFriendTarget } from "../relation/addFriendTarget.ts";

/**
 * The Add Friend keys of a Leaderboard page, from one lookup the server answers from the page number,
 * so that it starts with the page's own read. `isPagePlaceholder` says whether the rows shown are
 * still those of the page before: the relations of one page never stand for another's. `relations`
 * is the read a page gate waits on, null for a viewer who cannot have Friends.
 */
export function useLeaderboardAddFriendTargets(page: number, isPagePlaceholder: boolean) {
  const { session, gate } = useSession();
  const viewer = session.kind === "player" || session.kind === "named" ? session.player : null;
  const canHaveFriends = viewer !== null && viewer.nickname !== null;
  const relations = useQuery({
    ...leaderboardRelationsQueryOptions(canHaveFriends ? page : null),
    placeholderData: keepPreviousData,
  });
  const matching = relations.isPlaceholderData === isPagePlaceholder ? relations.data : undefined;
  return {
    targetOf: (nickname: string | null) =>
      addFriendTarget({ viewer, nickname, relations: matching }),
    /** Whether the session, which decides whether there is a lookup at all, is still being read. */
    isSessionChecking: gate.kind === "loading",
    relations: canHaveFriends ? relations : null,
  };
}
