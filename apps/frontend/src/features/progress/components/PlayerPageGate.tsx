import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import type { ProgressGame } from "../chart/progressChartRows.ts";
import { type PublicPlayer, usePlayerPageReads } from "../hooks/usePlayerPageReads.ts";

interface PlayerPageGateProps {
  nickname: string;
  /** `isProgressUpdating` while the Games shown are those of the previous period or kind. */
  children: (
    player: PublicPlayer,
    games: readonly ProgressGame[],
    isProgressUpdating: boolean,
  ) => ReactNode;
}

// Holds the page back until every panel can be drawn whole, so that none is pushed in or grows later.
export function PlayerPageGate({ nickname, children }: PlayerPageGateProps) {
  const { player, progress, isProgressUpdating, isPending, failure } = usePlayerPageReads(nickname);

  if (isPending) {
    return <StatusMessage role="status" icon={LoaderCircle} message="Reading this Player…" />;
  }
  if (failure) return <StatusMessage role="alert" icon={CircleAlert} message={failure} />;
  if (player === null || progress === null) return null;
  return children(player, progress.games, isProgressUpdating);
}
