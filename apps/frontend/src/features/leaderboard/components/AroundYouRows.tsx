import { TableBody, TableCell, TableRow } from "../../../shared/components/ui/table.tsx";
import type { AddFriendTarget } from "../../friends/relation/addFriendTarget.ts";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { aroundYouCaption } from "../own/aroundYouCaption.ts";
import { LeaderboardRow } from "./LeaderboardRow.tsx";

interface AroundYouRowsProps {
  around: LeaderboardPlayer[];
  own: LeaderboardPlayer | null;
  addFriendOf: (nickname: string | null) => AddFriendTarget;
}

// A second body of the same table, so that its columns line up with the page above it.
export function AroundYouRows({ around, own, addFriendOf }: AroundYouRowsProps) {
  const caption = aroundYouCaption(around);

  return (
    <TableBody aria-label="Around you">
      <TableRow className="border-0 hover:bg-transparent">
        <TableCell
          colSpan={5}
          className="border-y-2 border-key-outline bg-surface-plate px-5 py-3.5 type-eyebrow text-ink-subtle"
        >
          {caption}
        </TableCell>
      </TableRow>
      {around.map((player) => (
        <LeaderboardRow
          key={player.position}
          player={player}
          isOwn={player.position === own?.position}
          addFriend={addFriendOf(player.nickname)}
        />
      ))}
    </TableBody>
  );
}
