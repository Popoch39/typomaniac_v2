import { type AvatarPlayer, useAvatar } from "../hooks/useAvatar.ts";
import { cn } from "../lib/utils.ts";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar.tsx";

interface PlayerAvatarProps {
  player: AvatarPlayer;
  /** The reader's own avatar is an action key: that colour means "you". */
  isOwn?: boolean;
  className?: string;
}

// An avatar key. Decorative: it always sits next to the Nickname, which names the Player for assistive
// technologies.
export function PlayerAvatar({ player, isOwn = false, className }: PlayerAvatarProps) {
  const { pictureUrl, initial } = useAvatar(player);

  return (
    <Avatar
      aria-hidden="true"
      className={cn(
        "keycap size-11 rounded-md after:hidden [--keycap-depth:4px]",
        isOwn && "[--keycap-edge:var(--action-edge)]",
        className,
      )}
    >
      {/* Loaded straight from the provider's CDN, without telling it which page asked. */}
      <AvatarImage src={pictureUrl} alt="" referrerPolicy="no-referrer" className="rounded-[8px]" />
      {/* Sized in em, so that the initial grows with the font size the Avatar is given. */}
      <AvatarFallback
        className={cn(
          "rounded-[8px] font-display text-[1.25em]",
          isOwn ? "bg-action text-on-key" : "bg-key-face text-ink",
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
