import type { Ornament } from "@repo/ranked-engine";
import type { AvatarPlayer } from "../../../shared/hooks/useAvatar.ts";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";

interface TierPromotionAvatarProps {
  player: AvatarPlayer;
  ornament: NonNullable<Ornament>;
}

/**
 * The Participant's Avatar in an Ornament, at the size of the canvas: the canvas draws the Ornament
 * at 5px a pixel and the largest Ornamented Avatar at 3px, so it is scaled on the compositor to the
 * same 320 × 380 box.
 */
export function TierPromotionAvatar({ player, ornament }: TierPromotionAvatarProps) {
  return (
    <OrnamentedAvatar
      player={player}
      ornament={ornament}
      size="lg"
      isOwn
      className="scale-[calc(5/3)]"
    />
  );
}
