import type { ReactNode } from "react";
import type { ReadStage } from "../api/readStage.ts";
import { ErrorPanel } from "./ErrorPanel.tsx";
import { TryAgainKey } from "./TryAgainKey.tsx";

interface ReadGateProps {
  stage: ReadStage;
  /** Shown while the reads are pending, and again while a failed one is tried again. */
  pending: ReactNode;
  /** What failed, as the Error Panel's title, such as "Standing". */
  title: string;
  failure: string | null;
  retry: () => void;
  children: ReactNode;
}

/** The pending view, then the content once the reads are back, or an Error Panel to try them again. */
export function ReadGate({ stage, pending, title, failure, retry, children }: ReadGateProps) {
  if (stage === "loading") return pending;
  if (stage === "failed" && failure !== null) {
    return (
      <ErrorPanel title={title} message={failure}>
        <TryAgainKey onRetry={retry} />
      </ErrorPanel>
    );
  }
  return children;
}
