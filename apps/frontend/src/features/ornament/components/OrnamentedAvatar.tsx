import type { Ornament } from "@repo/ranked-engine";
import { PlayerAvatar } from "../../../shared/components/PlayerAvatar.tsx";
import type { AvatarPlayer } from "../../../shared/hooks/useAvatar.ts";
import { type OrnamentSize, useOrnamentDrawing } from "../hooks/useOrnamentDrawing.ts";
import { OrnamentArt } from "./OrnamentArt.tsx";

interface OrnamentedAvatarProps {
  player: AvatarPlayer;
  /** `null` for a bare Avatar. */
  ornament: Ornament;
  size: OrnamentSize;
  isOwn?: boolean;
  className?: string;
}

export function OrnamentedAvatar({
  player,
  ornament,
  size,
  isOwn = false,
  className,
}: OrnamentedAvatarProps) {
  const { drawing, frameClassName, avatarClassName } = useOrnamentDrawing(
    ornament,
    size,
    className,
  );
  const avatar = <PlayerAvatar player={player} isOwn={isOwn} className={avatarClassName} />;
  if (drawing === null) return avatar;

  return (
    <span className={frameClassName}>
      <OrnamentArt drawing={drawing} />
      {avatar}
    </span>
  );
}
