import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "../../auth/api/meQueryOptions.ts";
import { relationsQueryOptions } from "../api/relationsQueryOptions.ts";
import { addFriendTarget, relationLookupOf } from "../relation/addFriendTarget.ts";

/**
 * The Add Friend key each Player a page shows gets, from one lookup of the signed-in Player's
 * relation to all of them. `reads` are those a page gate may wait on: the session, and the lookup
 * when there is one to make.
 */
export function useAddFriendTargets(nicknames: readonly (string | null)[]) {
  const me = useQuery(meQueryOptions());
  const viewer = me.data ?? null;
  const lookup = relationLookupOf(viewer, nicknames);
  const relations = useQuery(relationsQueryOptions(lookup));
  return {
    targetOf: (nickname: string | null) =>
      addFriendTarget({ viewer, nickname, relations: relations.data }),
    /** Whether a key may show at all, so that its place is kept until the lookup answers. */
    hasLookup: lookup !== null,
    me,
    relations: lookup === null ? null : relations,
  };
}
