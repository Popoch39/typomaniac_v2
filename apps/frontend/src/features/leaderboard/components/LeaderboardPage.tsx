import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { LeaderboardContent } from "./LeaderboardContent.tsx";

export function LeaderboardPage() {
  return (
    <Page>
      <PageHeader title="Leaderboard" />
      <LeaderboardContent />
    </Page>
  );
}
