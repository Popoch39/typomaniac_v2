import { Panel } from "../../../shared/components/Panel.tsx";
import { ChooseNicknameNotice } from "../../auth/components/ChooseNicknameNotice.tsx";
import type { SignedInSession } from "../../auth/session/sessionOf.ts";
import { OnlinePlayers } from "../../online/components/OnlinePlayers.tsx";
import { useQueuePanelTag } from "../hooks/useQueuePanelTag.ts";
import { QueuePanel } from "./QueuePanel.tsx";

interface RankedQueueProps {
  session: SignedInSession;
}

// The Queue is for a Player with a Nickname: one without is told so rather than offered the key.
// Every Player is told before queueing that ranked refuses on-screen keyboards (ADR 0016).
export function RankedQueue({ session }: RankedQueueProps) {
  const tag = useQueuePanelTag();

  return (
    <Panel title="Queue" titleAside={<OnlinePlayers />} tag={tag}>
      {session.kind === "named" ? (
        <QueuePanel />
      ) : (
        <ChooseNicknameNotice purpose="enter the Queue" />
      )}
      <p className="m-0 mt-4 text-sm text-ink-muted">
        Ranked play needs a physical keyboard: on-screen keyboards and tools that insert text are
        not accepted.
      </p>
    </Panel>
  );
}
