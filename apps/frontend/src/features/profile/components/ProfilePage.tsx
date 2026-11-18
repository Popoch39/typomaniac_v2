import { SignInPrompt } from "../../auth/components/SignInPrompt.tsx";
import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { PlayerProfile } from "./PlayerProfile.tsx";

export function ProfilePage() {
  return (
    <Page>
      <h1>Profile</h1>
      <SignedInPlayerGate
        guest={
          <SignInPrompt explanation="Profiles are for signed-in Players. Sign in to see yours." />
        }
      >
        {(player) => <PlayerProfile player={player} />}
      </SignedInPlayerGate>
    </Page>
  );
}
