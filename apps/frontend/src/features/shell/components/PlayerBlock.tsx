import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import { GuestIdentity } from "./GuestIdentity.tsx";
import { PlayerIdentity } from "./PlayerIdentity.tsx";

export function PlayerBlock() {
  return (
    <div className="player-block">
      <SignedInPlayerGate guest={<GuestIdentity />}>
        {(player) => <PlayerIdentity player={player} />}
      </SignedInPlayerGate>
    </div>
  );
}
