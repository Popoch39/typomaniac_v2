import { createFileRoute } from "@tanstack/react-router";
import { LeaderboardPage } from "../../features/leaderboard/components/LeaderboardPage.tsx";

export const Route = createFileRoute("/_shell/leaderboard")({
  component: LeaderboardPage,
});
