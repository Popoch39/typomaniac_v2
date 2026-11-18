import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import { PlayerProfile } from "./PlayerProfile.tsx";

export function ProfilePage() {
  return (
    <main className="page">
      <h1>Profile</h1>
      <SignedInPlayerGate guestExplanation="Profiles are for signed-in Players. Sign in to see yours.">
        {(player) => <PlayerProfile nickname={player.nickname} avatarUrl={player.avatarUrl} />}
      </SignedInPlayerGate>
    </main>
  );
}
