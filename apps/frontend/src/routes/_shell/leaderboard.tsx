import { createFileRoute } from "@tanstack/react-router";
import { LeaderboardPage } from "../../features/leaderboard/components/LeaderboardPage.tsx";
import { readPageParam } from "../../features/leaderboard/page/readPageParam.ts";

export const Route = createFileRoute("/_shell/leaderboard")({
  validateSearch: (search: Record<string, unknown>) => ({ page: readPageParam(search.page) }),
  component: LeaderboardPage,
});
