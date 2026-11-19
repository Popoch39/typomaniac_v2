import { paginationWindow } from "../page/paginationWindow.ts";
import type { LeaderboardPlayer } from "./useLeaderboard.ts";
import { usePagePositions } from "./usePagePositions.ts";

export function useLeaderboardPagination(
  page: number,
  pageCount: number,
  players: LeaderboardPlayer[],
) {
  const positions = usePagePositions(players);
  return {
    summary: `Page ${page} of ${pageCount}${positions === null ? "" : ` · ${positions}`}`,
    items: paginationWindow(page, pageCount),
    previous: page > 1 ? page - 1 : null,
    next: page < pageCount ? page + 1 : null,
  };
}
