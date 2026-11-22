import { useMatchRoute } from "@tanstack/react-router";

export type Section =
  | "/ranked"
  | "/leaderboard"
  | "/custom"
  | "/practice"
  | "/friends"
  | "/profile"
  | "/admin";

export function useIsCurrentSection(section: Section) {
  const matchRoute = useMatchRoute();
  return matchRoute({ to: section }) !== false;
}
