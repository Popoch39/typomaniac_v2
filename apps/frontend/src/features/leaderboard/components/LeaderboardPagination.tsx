import type { Leaderboard } from "../hooks/useLeaderboard.ts";
import { useLeaderboardPagination } from "../hooks/useLeaderboardPagination.ts";
import { PageKey } from "./PageKey.tsx";
import { StepKey } from "./StepKey.tsx";

interface LeaderboardPaginationProps {
  leaderboard: Leaderboard;
}

export function LeaderboardPagination({ leaderboard }: LeaderboardPaginationProps) {
  const { summary, items, previous, next } = useLeaderboardPagination(leaderboard);

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
            <PageKey key={item.page} {...item} />
          ),
        )}
        <StepKey label="Next" page={next} />
      </div>
    </nav>
  );
}
