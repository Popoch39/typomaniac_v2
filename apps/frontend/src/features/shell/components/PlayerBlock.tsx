import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import { GuestIdentity } from "./GuestIdentity.tsx";
import { PlayerBlockFailed } from "./PlayerBlockFailed.tsx";
import { PlayerBlockSkeleton } from "./PlayerBlockSkeleton.tsx";
import { PlayerIdentity } from "./PlayerIdentity.tsx";

// Every state shares the PlayerChip's box, so that the block, anchored to the bottom of the sidebar,
// never grows upward when the session is known.
export function PlayerBlock() {
  return (
    <SignedInPlayerGate
      pending={
        <LoadingState message="Checking your session…">
          <PlayerBlockSkeleton />
        </LoadingState>
      }
      guest={<GuestIdentity />}
      failed={(failure, retry) => <PlayerBlockFailed failure={failure} retry={retry} />}
    >
      {(player) => <PlayerIdentity player={player} />}
    </SignedInPlayerGate>
  );
}
