import { useMatchRoute } from "@tanstack/react-router";

export type Section = "/ranked" | "/custom" | "/profile";

export function useIsCurrentSection(section: Section) {
  const matchRoute = useMatchRoute();
  return matchRoute({ to: section }) !== false;
}
