import { Link } from "@tanstack/react-router";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../../shared/components/ui/sidebar.tsx";
import { PlayerAvatar } from "../../auth/components/PlayerAvatar.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { SidebarSignOutButton } from "./SidebarSignOutButton.tsx";

interface PlayerIdentityProps {
  player: SignedInPlayer;
}

export function PlayerIdentity({ player }: PlayerIdentityProps) {
  return (
    <SidebarMenu className="gap-1">
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          tooltip={{ children: <PlayerNickname player={player} /> }}
        >
          <Link to="/profile">
            <PlayerAvatar player={player} />
            <span className="text-foreground">
              <PlayerNickname player={player} />
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarSignOutButton />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
