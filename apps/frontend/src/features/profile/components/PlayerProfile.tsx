import { Card, CardContent } from "../../../shared/components/ui/card.tsx";
import { PlayerAvatar } from "../../auth/components/PlayerAvatar.tsx";
import { PlayerNickname } from "../../auth/components/PlayerNickname.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";

import { ProfileRank } from "./ProfileRank.tsx";

interface PlayerProfileProps {
  player: SignedInPlayer;
}

export function PlayerProfile({ player }: PlayerProfileProps) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex items-center gap-6">
        <PlayerAvatar player={player} className="size-24 text-4xl" />
        <div className="flex flex-col gap-1">
          <p className="font-heading text-2xl wrap-anywhere text-foreground">
            <PlayerNickname player={player} />
          </p>
          <ProfileRank player={player} />
        </div>
      </CardContent>
    </Card>
  );
}
