import { SignInPrompt } from "../../auth/components/SignInPrompt.tsx";
import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { PlayerProfile } from "./PlayerProfile.tsx";
import { ProfileGate } from "./ProfileGate.tsx";
import { ProfileSkeleton } from "./ProfileSkeleton.tsx";

export function ProfilePage() {
  return (
    <Page>
      <PageHeader title="Profile" lead="Your Nickname, your Rank and your Ornament." />
      {/* While the session is checked, the Profile gate already stands in the place it takes once the
          Player is known, waiting without a Player: React keeps the same skeleton mounted through both
          stages, so the two waits look like one and the loading pixels never restart. */}
      <SignedInPlayerGate
        pending={
          <ProfileGate
            player={null}
            pending={
              <LoadingState message="Checking your session…">
                <ProfileSkeleton />
              </LoadingState>
            }
          >
            {() => null}
          </ProfileGate>
        }
        guest={
          <SignInPrompt explanation="Profiles are for signed-in Players. Sign in to see yours." />
        }
      >
        {(player) => (
          <ProfileGate
            player={player}
            pending={
              <LoadingState message="Reading your Profile…">
                <ProfileSkeleton />
              </LoadingState>
            }
          >
            {(standing) => <PlayerProfile player={player} standing={standing} />}
          </ProfileGate>
        )}
      </SignedInPlayerGate>
    </Page>
  );
}
