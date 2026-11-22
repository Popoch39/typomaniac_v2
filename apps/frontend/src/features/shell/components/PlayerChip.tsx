import { Link } from "@tanstack/react-router";
import { cn } from "../../../shared/lib/utils.ts";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { SignedInPlayer } from "../../auth/session/sessionOf.ts";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import { playerChipClassName } from "../chip/playerChipClassName.ts";
import { PlayerStandingLine } from "./PlayerStandingLine.tsx";

interface PlayerChipProps {
  player: SignedInPlayer;
}

// On the icon rail it shrinks to the avatar key, its text kept for screen readers.
export function PlayerChip({ player }: PlayerChipProps) {
  return (
    <Link
      to="/profile"
      className={cn(
        playerChipClassName,
        "key-travel text-ink no-underline active:translate-y-[3px] motion-reduce:active:translate-y-0",
      )}
    >
      {/* On the icon rail the chip shrinks to fit the rail's 48px. */}
      <OrnamentedAvatar
        player={player}
        ornament={player.ornament}
        size="sm"
        isOwn
        className="group-data-[collapsible=icon]:[zoom:0.75]"
      />
      <span className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:sr-only">
        <span className="truncate font-extrabold">
          <PlayerNickname player={player} />
        </span>
        <PlayerStandingLine player={player} />
      </span>
    </Link>
  );
}
