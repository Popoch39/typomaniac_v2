import { Page } from "../../../shared/components/Page.tsx";
import { CreateDuelButton } from "./CreateDuelButton.tsx";

export function CustomDuelPage() {
  return (
    <Page>
      <h1>Custom</h1>
      <p>Create a Custom Duel, then send its invite link to your Opponent.</p>
      <CreateDuelButton />
    </Page>
  );
}
