import { Card, CardContent } from "../../../shared/components/ui/card.tsx";
import { SignInPrompt } from "../../auth/components/SignInPrompt.tsx";
import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import { Page } from "../../../shared/components/Page.tsx";

export function RankedComingSoonPage() {
  return (
    <Page>
      <h1>Ranked</h1>
      <SignedInPlayerGate
        guest={
          <SignInPrompt explanation="Ranked play is for signed-in Players. Sign in to get access." />
        }
      >
        {() => (
          <Card className="w-full max-w-md">
            <CardContent>
              <p className="text-base">Ranked play is coming soon.</p>
            </CardContent>
          </Card>
        )}
      </SignedInPlayerGate>
    </Page>
  );
}
