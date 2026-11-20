import { ornamentOptions } from "../../ornament/picker/ornamentOptions.ts";
import { DangerStatusLine } from "../../../shared/components/DangerStatusLine.tsx";
import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { TryAgainKey } from "../../../shared/components/TryAgainKey.tsx";
import { OrnamentOptionGrid } from "../../ornament/components/OrnamentOptionGrid.tsx";
import { OrnamentPickerSkeleton } from "../../ornament/components/OrnamentPickerSkeleton.tsx";
import { PlayerPanel } from "../../player/components/PlayerPanel.tsx";
import { ProfileSkeleton } from "../../profile/components/ProfileSkeleton.tsx";
import { RankCard } from "../../ranked/components/RankCard.tsx";
import { playerFixture } from "../fixtures/playerFixture.ts";
import { standingFixture } from "../fixtures/standingFixture.ts";
import { useDevFailedRead } from "../hooks/useDevFailedRead.ts";
import { DevStateColumn } from "./DevStateColumn.tsx";

// The loaded Ornament picker is drawn by hand from its choices: the real one would read the API.
const OPTIONS = ornamentOptions("gold", standingFixture.rank);

export function DevProfileStates() {
  const profile = useDevFailedRead();
  const ornament = useDevFailedRead();

  return (
    <section aria-label="Profile" className="flex flex-col gap-8">
      <h2 className="m-0 type-section-title font-normal text-ink">Profile</h2>
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
        <DevStateColumn label="Skeleton">
          <ProfileSkeleton />
        </DevStateColumn>
        <DevStateColumn label="Loaded">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7 pb-2.5">
            <PlayerPanel player={playerFixture} isOwn />
            <RankCard standing={standingFixture} />
            <Panel title="Ornament" tag="Saving…" isTagHidden>
              <OrnamentOptionGrid
                player={playerFixture}
                options={OPTIONS}
                chosen="auto"
                isSaving={false}
                onChoose={() => undefined}
              />
              <DangerStatusLine message={null} />
            </Panel>
          </div>
        </DevStateColumn>
        <DevStateColumn label="Error">
          {profile.isRetrying ? (
            <LoadingState message="Reading your Profile…">
              <ProfileSkeleton />
            </LoadingState>
          ) : (
            <ErrorPanel title="Profile" message={profile.failure}>
              <TryAgainKey onRetry={profile.retry} />
            </ErrorPanel>
          )}
        </DevStateColumn>
        <DevStateColumn label="Ornament picker skeleton and error">
          <OrnamentPickerSkeleton />
          {ornament.isRetrying ? (
            <LoadingState message="Reading your Ornaments…">
              <OrnamentPickerSkeleton />
            </LoadingState>
          ) : (
            <ErrorPanel title="Ornament" message={ornament.failure}>
              <TryAgainKey onRetry={ornament.retry} />
            </ErrorPanel>
          )}
        </DevStateColumn>
      </div>
    </section>
  );
}
