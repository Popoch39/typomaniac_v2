import { Panel } from "../../../shared/components/Panel.tsx";
import { useBanNotice } from "../hooks/useBanNotice.ts";

interface BanNoticeProps {
  appealAddress: string;
}

/** Tells a banned Player, at sign-in, that they can no longer sign in, and where to contest it. */
export function BanNotice({ appealAddress }: BanNoticeProps) {
  const { summary, appealLink } = useBanNotice(appealAddress);

  return (
    <Panel title="Banned" flat>
      <p role="alert" className="m-0 text-ink">
        {summary}
      </p>
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
