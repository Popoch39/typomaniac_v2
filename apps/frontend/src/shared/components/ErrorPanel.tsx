import type { ReactNode } from "react";
import { DangerIcon } from "./DangerIcon.tsx";
import { Panel } from "./Panel.tsx";

interface ErrorPanelProps {
  /** What failed, such as "Standing". */
  title: string;
  /** A readable sentence, from `describeApiError` for an API failure. */
  message: string;
  /** The way out: one or two Keycaps, such as "Try again" or "Back home". */
  children: ReactNode;
}

/** A failed read, in the place of the content it stands in for. Errors are danger, never `loss`. */
export function ErrorPanel({ title, message, children }: ErrorPanelProps) {
  return (
    <Panel title={title}>
      <div className="flex items-start gap-3">
        <DangerIcon />
        <p role="alert" className="m-0 type-status text-ink">
          {message}
        </p>
      </div>
      <div className="flex flex-wrap gap-3 pb-1">{children}</div>
    </Panel>
  );
}
