import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { useDuelDisconnectionMessage } from "../hooks/useDuelDisconnectionMessage.ts";
import { useDuelRejoin } from "../hooks/useDuelRejoin.ts";

interface DuelDisconnectedProps {
  /** The reason the server gave as it closed the socket for good. */
  closeReason: string;
}

export function DuelDisconnected({ closeReason }: DuelDisconnectedProps) {
  const message = useDuelDisconnectionMessage(closeReason);
  const rejoin = useDuelRejoin();

  return (
    <ErrorPanel title="Duel" message={message}>
      <Keycap size="sm" onClick={rejoin}>
        Rejoin
      </Keycap>
    </ErrorPanel>
  );
}
