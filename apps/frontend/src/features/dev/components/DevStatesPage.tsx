import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { DevLeaderboardStates } from "./DevLeaderboardStates.tsx";

/** A dev-only page that shows each skeleton beside its loaded page, and each error state forced on. */
export function DevStatesPage() {
  return (
    <main className="flex min-h-svh flex-col gap-14 bg-surface-plate p-10 plate-dots">
      <PageHeader
        title="States"
        lead="Every loading and error state, beside what it stands in for."
      />
      <DevLeaderboardStates />
    </main>
  );
}
