import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { useDuelDisconnectionMessage } from "../hooks/useDuelDisconnectionMessage.ts";
import { useDuelRejoin } from "../hooks/useDuelRejoin.ts";

export function DuelDisconnected() {
  const message = useDuelDisconnectionMessage();
  const rejoin = useDuelRejoin();

  return (
    <ErrorPanel title="Duel" message={message}>
      <Keycap size="sm" onClick={rejoin}>
        Rejoin
      </Keycap>
    </ErrorPanel>
  );
}
