import type { ReactNode } from "react";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import { PlayerPageLink } from "../../player/components/PlayerPageLink.tsx";
import type { ListedPlayer } from "../api/friendsQueryOptions.ts";
import { PlayerRank } from "./PlayerRank.tsx";

interface FriendsPlayerRowProps {
  player: ListedPlayer;
  /** Why the row's last action failed; its line is kept even when empty, so that nothing moves. */
  failure: string | null;
  /** The keys on the right of the row. */
  children: ReactNode;
}

/** A Player on the Friends page: Avatar, Nickname leading to their page, Rank, and their keys. */
export function FriendsPlayerRow({ player, failure, children }: FriendsPlayerRowProps) {
  return (
    <li className="flex flex-col gap-1 border-t-2 border-surface-plate pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pb-1">
        <OrnamentedAvatar player={player} ornament={player.ornament} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="truncate text-base font-extrabold">
            <PlayerPageLink player={player} />
          </span>
          <PlayerRank rank={player.rank} />
        </span>
        <span className="flex gap-2.5">{children}</span>
      </div>
      <p role="alert" className="m-0 min-h-lh text-sm text-danger">
        {failure}
      </p>
    </li>
  );
}
