import { SignInPrompt } from "../../auth/components/SignInPrompt.tsx";
import { SignedInPlayerChain } from "../../auth/components/SignedInPlayerChain.tsx";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { PlayerProfile } from "./PlayerProfile.tsx";
import { ProfileGate } from "./ProfileGate.tsx";
import { ProfileSkeleton } from "./ProfileSkeleton.tsx";

export function ProfilePage() {
  return (
    <Page>
      <PageHeader
        title="Profile"
        lead="Your Nickname, your Rank, your Ornament and your Progress."
      />
      <SignedInPlayerChain
        guest={
          <SignInPrompt explanation="Profiles are for signed-in Players. Sign in to see yours." />
        }
      >
        {(player) => (
          <ProfileGate
            player={player}
            pending={
              <LoadingState
                message={player === null ? "Checking your session…" : "Reading your Profile…"}
              >
                <ProfileSkeleton />
              </LoadingState>
            }
          >
            {(standing, signedIn, progress, isProgressUpdating) => (
              <PlayerProfile
                player={signedIn}
                standing={standing}
                progress={progress}
                isProgressUpdating={isProgressUpdating}
              />
            )}
          </ProfileGate>
        )}
      </SignedInPlayerChain>
    </Page>
  );
}
