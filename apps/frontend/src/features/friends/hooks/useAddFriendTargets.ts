import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { useSession } from "../../auth/hooks/useSession.ts";
import { relationsQueryOptions } from "../api/relationsQueryOptions.ts";
import { addFriendTarget, relationLookupOf } from "../relation/addFriendTarget.ts";

/**
 * The Add Friend key each Player a page shows gets, from one lookup of the signed-in Player's
 * relation to all of them. A page gate may wait on the session and on `relations`, the lookup
 * when there is one to make.
 */
export function useAddFriendTargets(nicknames: readonly (string | null)[]) {
  const { session, gate } = useSession();
  const viewer = session.kind === "player" || session.kind === "named" ? session.player : null;
  const lookup = relationLookupOf(viewer, nicknames);
  const relations = useQuery(relationsQueryOptions(lookup));
  return {
    targetOf: (nickname: string | null) =>
      addFriendTarget({
        viewer,
        nickname,
        relations: relations.data,
        failure: relations.error === null ? null : describeApiError(relations.error),
      }),
    /** Whether a key may show at all, so that its place is kept until the lookup answers. */
    hasLookup: lookup !== null,
    /** Whether the session, which decides whether there is a lookup at all, is still being read. */
    isSessionChecking: gate.kind === "loading",
    relations: lookup === null ? null : relations,
  };
}
