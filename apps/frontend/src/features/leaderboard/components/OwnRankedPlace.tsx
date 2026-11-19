import { Keycap } from "../../../shared/components/Keycap.tsx";
import { LpBar } from "../../../shared/components/LpBar.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { useShowMyRow } from "../hooks/useShowMyRow.ts";

interface OwnRankedPlaceProps {
  own: LeaderboardPlayer;
  name: string;
  /** `null` in Master, where there is no Division to climb toward. */
  progress: { lp: number; next: string } | null;
}

export function OwnRankedPlace({ own, name, progress }: OwnRankedPlaceProps) {
  const { showMyRow } = useShowMyRow();

  return (
    <div className="flex flex-wrap items-center gap-6 pb-1">
      <div className="flex flex-none items-center gap-4">
        <span className="font-mono text-[40px] leading-none font-bold text-ink">
          <span className="sr-only">Position </span>#{own.position}
        </span>
        <OrnamentedAvatar player={own} ornament={own.ornament} size="sm" isOwn />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[17px] font-extrabold text-ink">
            <PlayerNickname player={own} />
          </span>
          <span className="type-tier-name text-ink">{name}</span>
        </span>
      </div>
      {progress === null ? (
        <p className="m-0 font-mono text-[17px] font-bold text-ink">
          {own.rank.lp} <span className="text-[13px] text-ink-subtle">LP</span>
        </p>
      ) : (
        <div className="min-w-0 flex-[1_1_260px]">
          <LpBar lp={progress.lp} next={progress.next} />
        </div>
      )}
      <div className="flex-none pb-1">
        <Keycap size="sm" onClick={showMyRow}>
          Show my row
        </Keycap>
      </div>
    </div>
  );
}
