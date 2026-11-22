import type { ReactNode } from "react";

interface FriendsPlayerListProps {
  /** Said in place of the list while it is empty. */
  empty: string;
  isEmpty: boolean;
  children: ReactNode;
}

export function FriendsPlayerList({ empty, isEmpty, children }: FriendsPlayerListProps) {
  if (isEmpty) return <p className="m-0 text-ink-muted">{empty}</p>;
  return <ul className="m-0 flex list-none flex-col gap-3 p-0">{children}</ul>;
}
