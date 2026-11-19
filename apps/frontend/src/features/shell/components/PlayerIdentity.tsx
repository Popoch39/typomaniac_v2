import { Link } from "@tanstack/react-router";
import { SidebarMenu, SidebarMenuItem } from "../../../shared/components/ui/sidebar.tsx";
import { PlayerAvatar } from "../../auth/components/PlayerAvatar.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { PlayerStandingLine } from "./PlayerStandingLine.tsx";
import { SidebarSignOutButton } from "./SidebarSignOutButton.tsx";

interface PlayerIdentityProps {
  player: SignedInPlayer;
}

// The PlayerChip: on the icon rail it shrinks to the avatar key, its text kept for screen readers.
export function PlayerIdentity({ player }: PlayerIdentityProps) {
  return (
    <SidebarMenu className="gap-2">
      <SidebarMenuItem>
        <Link
          to="/profile"
          className="key-travel flex min-w-0 items-center gap-3 rounded-lg border-2 border-key-outline bg-surface-raised p-2.5 pb-3 text-ink no-underline active:translate-y-[3px] motion-reduce:active:translate-y-0 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
        >
          <PlayerAvatar player={player} isOwn />
          <span className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:sr-only">
            <span className="truncate font-extrabold">
              <PlayerNickname player={player} />
            </span>
            <PlayerStandingLine player={player} />
          </span>
        </Link>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarSignOutButton />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
