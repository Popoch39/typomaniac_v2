import { cn } from "../../../shared/lib/utils.ts";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { ownRowAttributes } from "../own/ownRowAttributes.ts";
import { PodiumPlayer } from "./PodiumPlayer.tsx";

interface PodiumStepProps {
  position: 1 | 2 | 3;
  label: string;
  player: LeaderboardPlayer | null;
  isOwn: boolean;
}

const PEDESTAL_HEIGHTS = { 1: "md:h-46", 2: "md:h-33", 3: "md:h-24" } as const;

export function PodiumStep({ position, label, player, isOwn }: PodiumStepProps) {
  const isFirst = position === 1;

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
      <div
        aria-hidden="true"
        className={cn(
          "keycap mt-1.5 flex h-21 items-start justify-center self-stretch rounded-2xl pt-4.5 [--keycap-border:3px] [--keycap-depth:10px]",
          PEDESTAL_HEIGHTS[position],
          isFirst ? "bg-brand [--keycap-edge:var(--brand-edge)]" : "bg-key-face",
        )}
      >
        <span
          className={cn(
            "font-display text-5xl leading-none md:text-[64px]",
            isFirst ? "text-on-key" : "text-ink",
          )}
        >
          {position}
        </span>
      </div>
    </li>
  );
}
