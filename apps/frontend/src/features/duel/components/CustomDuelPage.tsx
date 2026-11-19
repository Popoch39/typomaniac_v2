import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { CreateDuelButton } from "./CreateDuelButton.tsx";

export function CustomDuelPage() {
  return (
    <Page>
      <PageHeader
        title="Custom"
        lead="Create a Custom Duel, then send its invite link to your Opponent."
      />
      <Panel title="Custom Duel" tag="Best of 3" className="max-w-md">
        <CreateDuelButton />
      </Panel>
    </Page>
  );
}
