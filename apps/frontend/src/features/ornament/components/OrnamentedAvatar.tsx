import type { Ornament } from "@repo/ranked-engine";
import { cn } from "../../../shared/lib/utils.ts";
import { PlayerAvatar } from "../../auth/components/PlayerAvatar.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { OrnamentArt } from "./OrnamentArt.tsx";

interface OrnamentedAvatarProps {
  player: Pick<SignedInPlayer, "nickname" | "avatarUrl">;
  /** `null` for a bare Avatar. */
  ornament: Ornament;
  /** `lg` draws the full Ornament, `sm` its chip form. */
  size: "sm" | "lg";
  isOwn?: boolean;
  className?: string;
}

// One pixel of the 64×76 grid is 1px at `sm` and 3px at `lg`.
const FRAME_SIZES = { sm: "h-19 w-16", lg: "h-57 w-48" } as const;

// The Avatar fills the Ornament's 32×32 window at (16, 22) of the grid, flush: the frame around it
// already draws the key's outline, so the Avatar key keeps neither border nor edge.
const AVATAR_IN_WINDOW = "absolute [--keycap-border:0px] [--keycap-depth:0px]";

const AVATAR_SIZES = {
  sm: "top-[22px] left-4 size-8 rounded-[3px] text-sm",
  lg: "top-[66px] left-12 size-24 rounded-[9px] text-4xl",
} as const;

const BARE_AVATAR_SIZES = { sm: "", lg: "size-24 text-4xl" } as const;

export function OrnamentedAvatar({
  player,
  ornament,
  size,
  isOwn = false,
  className,
}: OrnamentedAvatarProps) {
  if (ornament === null)
    return (
      <PlayerAvatar
        player={player}
        isOwn={isOwn}
        className={cn(BARE_AVATAR_SIZES[size], className)}
      />
    );

  return (
    <span className={cn("relative inline-block shrink-0", FRAME_SIZES[size], className)}>
      <OrnamentArt ornament={ornament} detail={size === "lg" ? "full" : "chip"} />
      <PlayerAvatar
        player={player}
        isOwn={isOwn}
        className={cn(AVATAR_IN_WINDOW, AVATAR_SIZES[size])}
      />
    </span>
  );
}
