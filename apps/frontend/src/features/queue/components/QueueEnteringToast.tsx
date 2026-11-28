import { FindDuelIcon } from "../../../shared/components/FindDuelIcon.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { QueueToastPanel } from "./QueueToastPanel.tsx";

/** The toast of a Player entering the Queue again off the Ranked page, until the Queue answers. */
export function QueueEnteringToast() {
  return (
    <QueueToastPanel role="status" message="Entering the Queue…">
      <Keycap type="button" variant="brand" size="sm" disabled>
        <FindDuelIcon />
        Entering…
      </Keycap>
    </QueueToastPanel>
  );
}
