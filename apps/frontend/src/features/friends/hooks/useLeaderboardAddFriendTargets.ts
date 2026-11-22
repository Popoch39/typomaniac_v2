import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "../../auth/api/meQueryOptions.ts";
import { leaderboardRelationsQueryOptions } from "../api/leaderboardRelationsQueryOptions.ts";
import { addFriendTarget } from "../relation/addFriendTarget.ts";

/**
 * The Add Friend keys of a Leaderboard page, from one lookup the server answers from the page number,
 * so that it starts with the page's own read. `isPagePlaceholder` says whether the rows shown are
 * still those of the page before: the relations of one page never stand for another's. `relations`
 * is the read a page gate waits on, null for a viewer who cannot have Friends.
 */
export function useLeaderboardAddFriendTargets(page: number, isPagePlaceholder: boolean) {
  const me = useQuery(meQueryOptions());
  const viewer = me.data ?? null;
  const canHaveFriends = viewer !== null && viewer.nickname !== null;
  const relations = useQuery({
    ...leaderboardRelationsQueryOptions(canHaveFriends ? page : null),
    placeholderData: keepPreviousData,
  });
  const matching = relations.isPlaceholderData === isPagePlaceholder ? relations.data : undefined;
  return {
    targetOf: (nickname: string | null) =>
      addFriendTarget({ viewer, nickname, relations: matching }),
    me,
    relations: canHaveFriends ? relations : null,
  };
}
