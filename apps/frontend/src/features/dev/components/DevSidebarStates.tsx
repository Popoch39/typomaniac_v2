import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { GuestIdentity } from "../../shell/components/GuestIdentity.tsx";
import { PlayerBlockFailed } from "../../shell/components/PlayerBlockFailed.tsx";
import { PlayerBlockSkeleton } from "../../shell/components/PlayerBlockSkeleton.tsx";
import { PlayerIdentity } from "../../shell/components/PlayerIdentity.tsx";
import { signedInPlayerFixture } from "../fixtures/signedInPlayerFixture.ts";
import { useDevFailedRead } from "../hooks/useDevFailedRead.ts";
import { DevSidebarFrame } from "./DevSidebarFrame.tsx";
import { DevStateColumn } from "./DevStateColumn.tsx";

// Bottoms aligned, as in the sidebar's footer, so that a block taller than the skeleton stands out.
export function DevSidebarStates() {
  const { failure, isRetrying, retry } = useDevFailedRead();
  const failed = isRetrying ? (
    <LoadingState message="Checking your session…">
      <PlayerBlockSkeleton />
    </LoadingState>
  ) : (
    <PlayerBlockFailed failure={failure} retry={retry} />
  );

  return (
    <section aria-label="Sidebar" className="flex flex-col gap-8">
      <h2 className="m-0 type-section-title font-normal text-ink">Sidebar</h2>
      {[false, true].map((isRail) => (
        <DevStateColumn key={String(isRail)} label={isRail ? "Icon rail" : "Expanded"}>
          <div className="flex flex-wrap items-end gap-8">
            <DevSidebarFrame label="Skeleton" isRail={isRail}>
              <PlayerBlockSkeleton />
            </DevSidebarFrame>
            <DevSidebarFrame label="Guest" isRail={isRail}>
              <GuestIdentity />
            </DevSidebarFrame>
            <DevSidebarFrame label="Player" isRail={isRail}>
              <PlayerIdentity player={signedInPlayerFixture} />
            </DevSidebarFrame>
            <DevSidebarFrame label="Failed" isRail={isRail}>
              {failed}
            </DevSidebarFrame>
          </div>
        </DevStateColumn>
      ))}
    </section>
  );
}
