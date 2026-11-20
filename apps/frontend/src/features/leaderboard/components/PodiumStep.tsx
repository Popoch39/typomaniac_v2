import { cn } from "../../../shared/lib/utils.ts";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { ownRowAttributes } from "../own/ownRowAttributes.ts";
import { PodiumPedestal } from "./PodiumPedestal.tsx";
import { PodiumPlayer } from "./PodiumPlayer.tsx";

interface PodiumStepProps {
  position: 1 | 2 | 3;
  label: string;
  player: LeaderboardPlayer | null;
  isOwn: boolean;
}

export function PodiumStep({ position, label, player, isOwn }: PodiumStepProps) {
  return (
    <li
      {...ownRowAttributes(isOwn)}
      className={cn(
        "flex min-w-0 scroll-my-6 flex-col items-center gap-3.5 pb-2.5 outline-none",
        position === 2 && "md:-order-1",
      )}
    >
      <span className="sr-only">{player === null ? `${label}: nobody yet` : `${label}:`}</span>
      {player !== null && <PodiumPlayer player={player} isOwn={isOwn} />}
      <PodiumPedestal position={position} />
    </li>
  );
}
