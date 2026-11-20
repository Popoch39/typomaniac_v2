import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import { playerChipClassName } from "../chip/playerChipClassName.ts";
import { PlayerBlockLayout } from "./PlayerBlockLayout.tsx";
import { SidebarSignInButton } from "./SidebarSignInButton.tsx";

const GUEST_AVATAR = { nickname: "Guest", avatarUrl: null };

// A Guest gets a chip of the Player's size, so that the skeleton shown while the session is checked
// gives way to it without the bottom-anchored block changing height.
export function GuestIdentity() {
  return (
    <PlayerBlockLayout
      chip={
        <div className={playerChipClassName}>
          <OrnamentedAvatar
            player={GUEST_AVATAR}
            ornament={null}
            size="sm"
            className="group-data-[collapsible=icon]:[zoom:0.75]"
          />
          {/* "Guest" has no icon to shrink to on the rail: it stays for screen readers only. */}
          <span className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:sr-only">
            <span className="truncate font-extrabold text-ink">Guest</span>
            <span className="truncate type-mono-sm font-normal text-ink-subtle">Not signed in</span>
          </span>
        </div>
      }
      action={<SidebarSignInButton />}
    />
  );
}
