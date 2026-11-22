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
      <PageHeader title="Profile" />
      <SignedInPlayerChain
        guest={
          <SignInPrompt explanation="Profiles are for signed-in Players. Sign in to see yours." />
        }
      >
        {(session) => (
          <ProfileGate
            session={session}
            pending={
              <LoadingState
                message={
                  session.kind === "checking" ? "Checking your session…" : "Reading your Profile…"
                }
              >
                <ProfileSkeleton />
              </LoadingState>
            }
          >
            {(profile) => <PlayerProfile profile={profile} />}
          </ProfileGate>
        )}
      </SignedInPlayerChain>
    </Page>
  );
}
