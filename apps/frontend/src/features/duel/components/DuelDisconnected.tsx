import { ErrorPanel } from "../../../shared/components/ErrorPanel.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { useDuelRejoin } from "../hooks/useDuelRejoin.ts";

export function DuelDisconnected() {
  const rejoin = useDuelRejoin();

  return (
    <ErrorPanel title="Duel" message="The connection to the Duel was lost.">
      <Keycap size="sm" onClick={rejoin}>
        Rejoin
      </Keycap>
    </ErrorPanel>
  );
}
