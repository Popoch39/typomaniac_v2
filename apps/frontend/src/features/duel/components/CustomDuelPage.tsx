import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../shared/components/ui/card.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { CreateDuelButton } from "./CreateDuelButton.tsx";

export function CustomDuelPage() {
  return (
    <Page>
      <h1>Custom Duel</h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Custom Duel</CardTitle>
          <CardDescription className="text-base">
            Create a Custom Duel, then send its invite link to your Opponent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateDuelButton />
        </CardContent>
      </Card>
    </Page>
  );
}
