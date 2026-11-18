import { SignInPrompt } from "../../auth/components/SignInPrompt.tsx";
import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { RankedStanding } from "./RankedStanding.tsx";

export function RankedPage() {
  return (
    <Page>
      <h1>Ranked</h1>
      <SignedInPlayerGate
        guest={
          <SignInPrompt explanation="Ranked play is for signed-in Players. Sign in to get access." />
        }
      >
        {(player) => <RankedStanding player={player} />}
      </SignedInPlayerGate>
    </Page>
  );
}
