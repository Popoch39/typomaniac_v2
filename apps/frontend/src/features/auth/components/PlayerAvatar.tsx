import { Avatar, AvatarFallback, AvatarImage } from "../../../shared/components/ui/avatar.tsx";
import { useAvatar } from "../hooks/useAvatar.ts";
import type { SignedInPlayer } from "../hooks/useSignedInPlayer.ts";

interface PlayerAvatarProps {
  player: SignedInPlayer;
  className?: string;
}

// Decorative: it always sits next to the Nickname, which names the Player for assistive technologies.
export function PlayerAvatar({ player, className }: PlayerAvatarProps) {
  const { pictureUrl, initial } = useAvatar(player);

  return (
    <Avatar aria-hidden="true" className={className}>
      {/* Loaded straight from the provider's CDN, without telling it which page asked. */}
      <AvatarImage src={pictureUrl} alt="" referrerPolicy="no-referrer" />
      {/* Sized in em, so that the initial grows with the font size the Avatar is given. */}
      <AvatarFallback className="bg-accent text-[1em] font-semibold text-primary">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
