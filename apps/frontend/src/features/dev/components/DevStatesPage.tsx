import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { DevDuelStates } from "./DevDuelStates.tsx";
import { DevInlineErrorStates } from "./DevInlineErrorStates.tsx";
import { DevLeaderboardStates } from "./DevLeaderboardStates.tsx";
import { DevProfileStates } from "./DevProfileStates.tsx";
import { DevRankedStates } from "./DevRankedStates.tsx";
import { DevRouteStates } from "./DevRouteStates.tsx";
import { DevSidebarStates } from "./DevSidebarStates.tsx";

/** A dev-only page that shows each skeleton beside its loaded page, and each error state forced on. */
export function DevStatesPage() {
  return (
    <main className="flex min-h-svh flex-col gap-14 bg-surface-plate p-10 plate-dots">
      <PageHeader title="States" />
      <DevRankedStates />
      <DevProfileStates />
      <DevLeaderboardStates />
      <DevSidebarStates />
      <DevRouteStates />
      <DevDuelStates />
      <DevInlineErrorStates />
    </main>
  );
}
