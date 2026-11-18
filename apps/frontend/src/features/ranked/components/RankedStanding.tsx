import { Card, CardContent } from "../../../shared/components/ui/card.tsx";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { StandingGate } from "./StandingGate.tsx";

interface RankedStandingProps {
  player: SignedInPlayer;
}

export function RankedStanding({ player }: RankedStandingProps) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col gap-1">
        <StandingGate player={player}>
          {({ headline, detail }) => (
            <>
              <p className="font-heading text-2xl text-foreground">{headline}</p>
              <p className="text-base text-muted-foreground">{detail}</p>
            </>
          )}
        </StandingGate>
      </CardContent>
    </Card>
  );
}
