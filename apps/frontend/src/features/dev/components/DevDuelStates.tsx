import { DuelDisconnected } from "../../duel/components/DuelDisconnected.tsx";
import { DuelInviteLink } from "../../duel/components/DuelInviteLink.tsx";
import { DuelParticipants } from "../../duel/components/DuelParticipants.tsx";
import { DuelReconnectingLine } from "../../duel/components/DuelReconnectingLine.tsx";
import { DuelRefusalPanel } from "../../duel/components/DuelRefusalPanel.tsx";
import { DuelSkeleton } from "../../duel/components/DuelSkeleton.tsx";
import { duelRefusalFixture, duelWaitingFixture } from "../fixtures/duelFixture.ts";
import { DevStateColumn } from "./DevStateColumn.tsx";

// Each column is laid out as the Duel screen's column, so that the skeleton lines up with the
// waiting screen it stands in for. "Rejoin" does nothing here: no Duel is joined.
export function DevDuelStates() {
  return (
    <section aria-label="Duel" className="flex flex-col gap-8">
      <h2 className="m-0 type-section-title font-normal text-ink">Duel</h2>
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
        <DevStateColumn label="Connecting">
          <div className="flex flex-col gap-4">
            <DuelSkeleton />
          </div>
        </DevStateColumn>
        <DevStateColumn label="Waiting">
          <div className="flex flex-col gap-4">
            <DuelParticipants {...duelWaitingFixture.participants} />
            <DuelInviteLink link={duelWaitingFixture.link} />
          </div>
        </DevStateColumn>
        <DevStateColumn label="Refused">
          <DuelRefusalPanel message={duelRefusalFixture} />
        </DevStateColumn>
        <DevStateColumn label="Disconnected">
          <DuelDisconnected closeReason="" />
        </DevStateColumn>
        <DevStateColumn label="Reconnecting">
          <div className="w-fit">
            <DuelReconnectingLine isReconnecting />
          </div>
        </DevStateColumn>
      </div>
    </section>
  );
}
