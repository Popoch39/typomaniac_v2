import type { ReactNode } from "react";
import { Panel } from "../../../shared/components/Panel.tsx";

interface QueueToastPanelProps {
  role: "status" | "alert";
  message: string;
  /** Read out without being shown, for a toast whose keys already say it. */
  isMessageHidden?: boolean;
  /** The row of keys, and what leads back to the Ranked page. */
  children: ReactNode;
}

/** The frame every Queue toast shares: its announced message, then its row of keys. */
export function QueueToastPanel({
  role,
  message,
  isMessageHidden = false,
  children,
}: QueueToastPanelProps) {
  return (
    <Panel title="Queue" className="pointer-events-auto gap-4 p-5">
      <p role={role} className={isMessageHidden ? "sr-only" : "m-0 text-sm text-pretty text-ink"}>
        {message}
      </p>
      <div className="flex items-center gap-3 pb-1">{children}</div>
    </Panel>
  );
}
