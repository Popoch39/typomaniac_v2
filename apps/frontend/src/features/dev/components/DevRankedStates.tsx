import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { TryAgainKey } from "../../../shared/components/TryAgainKey.tsx";
import { QueueIdle } from "../../queue/components/QueueIdle.tsx";
import { RankCard } from "../../ranked/components/RankCard.tsx";
import { RankedSkeleton } from "../../ranked/components/RankedSkeleton.tsx";
import { TierLadder } from "../../ranked/components/TierLadder.tsx";
import { standingFixture } from "../fixtures/standingFixture.ts";
import { useDevFailedRead } from "../hooks/useDevFailedRead.ts";
import { DevStateColumn } from "./DevStateColumn.tsx";

// The loaded page draws the idle Queue by hand: the real one would join the Queue's socket.
export function DevRankedStates() {
  const { failure, isRetrying, retry } = useDevFailedRead();

  return (
    <section aria-label="Ranked" className="flex flex-col gap-8">
      <h2 className="m-0 type-section-title font-normal text-ink">Ranked</h2>
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
        <DevStateColumn label="Skeleton">
          <RankedSkeleton />
        </DevStateColumn>
        <DevStateColumn label="Loaded">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7 pb-2.5">
            <RankCard standing={standingFixture} />
            <Panel title="Queue" tag="Best of 3">
              <QueueIdle enter={() => undefined} isEntering={false} />
            </Panel>
          </div>
          <TierLadder rank={standingFixture.rank} />
        </DevStateColumn>
      </div>
      <DevStateColumn label="Error">
        {isRetrying ? (
          <LoadingState message="Reading your Standing…">
            <RankedSkeleton />
          </LoadingState>
        ) : (
          <ErrorPanel title="Standing" message={failure}>
            <TryAgainKey onRetry={retry} />
          </ErrorPanel>
        )}
      </DevStateColumn>
    </section>
  );
}
