import { pageKeyLabel } from "../page/pageKeyLabel.ts";
import { paginationWindow } from "../page/paginationWindow.ts";
import type { Leaderboard } from "./useLeaderboard.ts";
import { usePagePositions } from "./usePagePositions.ts";

export function useLeaderboardPagination({ page, pageCount, players, own }: Leaderboard) {
  const positions = usePagePositions(players);
  const ownPosition = own?.position ?? null;
  return {
    summary: `Page ${page} of ${pageCount}${positions === null ? "" : ` · ${positions}`}`,
    items: paginationWindow(page, pageCount).map((item) =>
      item === "ellipsis"
        ? item
        : { page: item, label: pageKeyLabel(item, ownPosition), isCurrent: item === page },
    ),
    previous: page > 1 ? page - 1 : null,
    next: page < pageCount ? page + 1 : null,
  };
}
