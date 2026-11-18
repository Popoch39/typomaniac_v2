import { useAvatarInitial } from "../hooks/useAvatarInitial.ts";
import "./Avatar.css";

interface AvatarProps {
  avatarUrl: string | null;
  nickname: string | null;
}

// Decorative: it always sits next to the Nickname, which names the Player for assistive technologies.
export function Avatar({ avatarUrl, nickname }: AvatarProps) {
  const initial = useAvatarInitial(nickname);

  if (avatarUrl === null) {
    return (
      <span className="avatar" aria-hidden="true">
        {initial}
      </span>
    );
  }
  // Loaded straight from the provider's CDN, without telling it which page asked.
  return <img className="avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />;
}
