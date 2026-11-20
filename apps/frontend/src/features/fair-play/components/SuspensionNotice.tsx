import { Panel } from "../../../shared/components/Panel.tsx";
import { useSuspensionNotice } from "../hooks/useSuspensionNotice.ts";
import type { Suspension } from "../notice/describeSuspension.ts";

interface SuspensionNoticeProps {
  suspension: Suspension;
}

/** Tells a suspended Player until when the Queue is closed to them, and where to contest it. */
export function SuspensionNotice({ suspension }: SuspensionNoticeProps) {
  const { summary, appealAddress, appealLink } = useSuspensionNotice(suspension);

  return (
    <Panel title="Suspended" flat>
      <p className="m-0 text-ink">{summary}</p>
      <p className="m-0 text-ink-muted">
        To contest it, write to{" "}
        <a href={appealLink} className="text-ink underline">
          {appealAddress}
        </a>
        .
      </p>
    </Panel>
  );
}
