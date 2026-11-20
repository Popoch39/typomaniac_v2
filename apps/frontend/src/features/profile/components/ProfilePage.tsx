import { SignInPrompt } from "../../auth/components/SignInPrompt.tsx";
import { LoaderCircle } from "lucide-react";
import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { PlayerProfile } from "./PlayerProfile.tsx";

export function ProfilePage() {
  return (
    <Page>
      <PageHeader title="Profile" lead="Your Nickname, your Rank and your Ornament." />
      <SignedInPlayerGate
        pending={
          <StatusMessage role="status" icon={LoaderCircle} message="Checking your session…" />
        }
        guest={
          <SignInPrompt explanation="Profiles are for signed-in Players. Sign in to see yours." />
        }
      >
        {(player) => <PlayerProfile player={player} />}
      </SignedInPlayerGate>
    </Page>
  );
}
