import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { StandingGate } from "../../ranked/components/StandingGate.tsx";

interface ProfileRankProps {
  player: SignedInPlayer;
}

export function ProfileRank({ player }: ProfileRankProps) {
  return (
    <StandingGate player={player}>
      {({ headline, detail }) => (
        <p className="text-base text-muted-foreground">
          {headline} · {detail}
        </p>
      )}
    </StandingGate>
  );
}
