import { Card, CardContent } from "../../../shared/components/ui/card.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { QueuePanel } from "./QueuePanel.tsx";

interface RankedQueueProps {
  player: SignedInPlayer;
}

// The Queue is for a Player with a Nickname: one without is told so rather than offered the button.
export function RankedQueue({ player }: RankedQueueProps) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-start gap-3">
        {player.nickname === null ? (
          <p className="text-base">Choose a Nickname to enter the Queue.</p>
        ) : (
          <QueuePanel />
        )}
      </CardContent>
    </Card>
  );
}
