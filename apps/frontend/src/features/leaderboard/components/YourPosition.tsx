import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { YourPositionContent } from "./YourPositionContent.tsx";
import { YourPositionSkeleton } from "./YourPositionSkeleton.tsx";

interface YourPositionProps {
  own: LeaderboardPlayer | null;
}

// The one section that depends on the session: while it is checked, the Panel keeps its box, and a
// failed check is said in its place rather than over the whole Leaderboard.
export function YourPosition({ own }: YourPositionProps) {
  return (
    <SignedInPlayerGate
      pending={
        <LoadingState message="Checking your session…">
          <YourPositionSkeleton />
        </LoadingState>
      }
      guest={null}
    >
      {() => <YourPositionContent own={own} />}
    </SignedInPlayerGate>
  );
}
