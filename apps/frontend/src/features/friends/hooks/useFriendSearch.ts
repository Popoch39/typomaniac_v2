import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { friendSearchQueryOptions } from "../api/friendSearchQueryOptions.ts";
import { searchTermOf } from "../search/searchTermOf.ts";
import { useFriendSearchStore } from "../store/useFriendSearchStore.ts";

/** The Nickname search: what was typed, the Players found for it, and a line saying where it stands. */
export function useFriendSearch() {
  const typed = useFriendSearchStore((s) => s.typed);
  const term = useFriendSearchStore((s) => s.term);
  const type = useFriendSearchStore((s) => s.type);
  const search = useQuery(friendSearchQueryOptions(term));
  // Results are only shown for what the field still holds: emptied, it shows none.
  const players = searchTermOf(typed) === null ? [] : (search.data ?? []);
  const status = () => {
    if (searchTermOf(typed) === null) return "Type at least 2 characters of a Nickname.";
    if (search.isFetching || term !== searchTermOf(typed)) return "Searching…";
    if (search.isSuccess && players.length === 0) return "No Player goes by a Nickname like this.";
    return null;
  };
  return {
    typed,
    type,
    players,
    status: status(),
    failure: search.error === null ? null : describeApiError(search.error),
  };
}
