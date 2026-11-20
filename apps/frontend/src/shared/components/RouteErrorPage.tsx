import type { ReactNode } from "react";
import { useIsInShell } from "../hooks/useIsInShell.ts";
import { Page } from "./Page.tsx";

interface RouteErrorPageProps {
  children: ReactNode;
}

// Inside the shell, its content area is already the main landmark; outside it (a Duel, an unknown URL) there is none.
export function RouteErrorPage({ children }: RouteErrorPageProps) {
  const isInShell = useIsInShell();
  const page = <Page>{children}</Page>;
  return isInShell ? page : <main>{page}</main>;
}
