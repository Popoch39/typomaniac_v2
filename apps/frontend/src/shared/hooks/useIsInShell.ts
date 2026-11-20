import { useMatch } from "@tanstack/react-router";

/** Whether the shell, whose content area is the page's main landmark, is drawn around the current route. */
export function useIsInShell() {
  return (
    useMatch({
      from: "/_shell",
      shouldThrow: false,
      select: (match) => match.status !== "error",
    }) ?? false
  );
}
