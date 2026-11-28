import { FindDuelIcon } from "../../../shared/components/FindDuelIcon.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";

/** The toast of a Player entering the Queue again off the Ranked page, until the Queue answers. */
export function QueueEnteringToast() {
  return (
    <Panel title="Queue" className="pointer-events-auto gap-4 p-5">
      <p role="status" className="m-0 text-sm text-pretty text-ink">
        Entering the Queue…
      </p>
      <div className="pb-1">
        <Keycap type="button" variant="brand" size="sm" disabled>
          <FindDuelIcon />
          Entering…
        </Keycap>
      </div>
    </Panel>
  );
}
