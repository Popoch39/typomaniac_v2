import { useAvatar } from "../hooks/useAvatar.ts";
import type { SignedInPlayer } from "../hooks/useSignedInPlayer.ts";
import "./Avatar.css";

interface AvatarProps {
  player: SignedInPlayer;
}

// Decorative: it always sits next to the Nickname, which names the Player for assistive technologies.
export function Avatar({ player }: AvatarProps) {
  const { pictureUrl, onPictureError, initial } = useAvatar(player);

  if (pictureUrl === null) {
    return (
      <span className="avatar" aria-hidden="true">
        {initial}
      </span>
    );
  }
  // Loaded straight from the provider's CDN, without telling it which page asked.
  return (
    <img
      className="avatar"
      src={pictureUrl}
      alt=""
      referrerPolicy="no-referrer"
      onError={onPictureError}
    />
  );
}
