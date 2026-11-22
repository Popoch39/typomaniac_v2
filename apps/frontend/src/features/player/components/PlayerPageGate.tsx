import type { ReactNode } from "react";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import {
  type Progress,
  type PublicPlayer,
  usePlayerPageReads,
} from "../hooks/usePlayerPageReads.ts";

interface PlayerPageGateProps {
  nickname: string;
  /** Shown while the page is read, and again while a failed read is tried again. */
  pending: ReactNode;
  /** `isProgressUpdating` while the Progress shown is that of the previous period or kind. */
  children: (player: PublicPlayer, progress: Progress, isProgressUpdating: boolean) => ReactNode;
}

// Holds the page back until every panel can be drawn whole, so that none is pushed in or grows later.
export function PlayerPageGate({ nickname, pending, children }: PlayerPageGateProps) {
  const gate = usePlayerPageReads(nickname);

  return (
    <ReadGate state={gate} pending={pending} title="Player">
      {({ player, progress, isProgressUpdating }) => children(player, progress, isProgressUpdating)}
    </ReadGate>
  );
}
