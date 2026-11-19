import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { useLeaderboardPagination } from "../hooks/useLeaderboardPagination.ts";
import { PageKey } from "./PageKey.tsx";
import { StepKey } from "./StepKey.tsx";

interface LeaderboardPaginationProps {
  page: number;
  pageCount: number;
  players: LeaderboardPlayer[];
}

export function LeaderboardPagination({ page, pageCount, players }: LeaderboardPaginationProps) {
  const { summary, items, previous, next } = useLeaderboardPagination(page, pageCount, players);

  return (
    <nav
      aria-label="Leaderboard pages"
      className="flex flex-wrap items-center justify-between gap-4 pb-1.5"
    >
      <span className="font-mono text-[13px] font-bold text-ink-subtle">{summary}</span>
      <div className="flex flex-wrap items-center gap-2.5">
        <StepKey label="Prev" page={previous} />
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-1 font-mono text-[15px] font-bold text-ink-subtle"
            >
              …
            </span>
          ) : (
            <PageKey key={item} page={item} isCurrent={item === page} />
          ),
        )}
        <StepKey label="Next" page={next} />
      </div>
    </nav>
  );
}
