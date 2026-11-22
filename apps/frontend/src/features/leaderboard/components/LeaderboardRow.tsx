import { TableCell, TableRow } from "../../../shared/components/ui/table.tsx";
import { AddFriendSlot } from "../../friends/components/AddFriendSlot.tsx";
import type { AddFriendTarget } from "../../friends/relation/addFriendTarget.ts";
import { PlayerPageLink } from "../../player/components/PlayerPageLink.tsx";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { ownRowAttributes } from "../own/ownRowAttributes.ts";
import { LpAmount } from "./LpAmount.tsx";
import { RankLabel } from "./RankLabel.tsx";
import { YouTag } from "./YouTag.tsx";

interface LeaderboardRowProps {
  player: LeaderboardPlayer;
  isOwn: boolean;
  addFriend: AddFriendTarget;
}

// Rows are split by a line of the plate, not a grey rule.
export function LeaderboardRow({ player, isOwn, addFriend }: LeaderboardRowProps) {
  return (
    <TableRow
      {...ownRowAttributes(isOwn)}
      className="group/row scroll-my-6 border-t-2 border-b-0 border-surface-plate outline-none hover:bg-transparent aria-[current=true]:bg-surface-raised aria-[current=true]:outline-2 aria-[current=true]:-outline-offset-2 aria-[current=true]:outline-action"
    >
      <TableCell className="py-2.5 pr-4 pl-5 text-right font-mono text-[17px] font-bold group-aria-[current=true]/row:text-action">
        {player.position}
      </TableCell>
      <TableCell className="px-4 py-2.5">
        <span className="flex items-center gap-3.5 text-base font-extrabold">
          <OrnamentedAvatar player={player} ornament={player.ornament} size="sm" isOwn={isOwn} />
          <PlayerPageLink player={player} />
          {isOwn && <YouTag />}
        </span>
      </TableCell>
      <TableCell className="px-4 py-2.5">
        <RankLabel rank={player.rank} />
      </TableCell>
      <TableCell className="px-4 py-2.5 text-right font-mono text-[17px] font-bold">
        <LpAmount lp={player.rank.lp} />
      </TableCell>
      <TableCell className="py-2.5 pr-6 pl-4">
        <span className="flex justify-end">
          <AddFriendSlot target={addFriend} failureAlign="end" />
        </span>
      </TableCell>
    </TableRow>
  );
}
