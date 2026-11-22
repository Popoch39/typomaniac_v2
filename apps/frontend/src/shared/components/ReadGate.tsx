import type { ReactNode } from "react";
import type { ReadGateState } from "../api/readStage.ts";
import { ErrorPanel } from "./ErrorPanel.tsx";
import { TryAgainKey } from "./TryAgainKey.tsx";

interface ReadGateProps<T> {
  state: ReadGateState<T>;
  /** Shown while the reads are pending, and again while a failed one is tried again. */
  pending: ReactNode;
  /** What failed, as the Error Panel's title, such as "Standing". */
  title: string;
  children: (data: T) => ReactNode;
}

/** The pending view, then the content once the reads are back, or an Error Panel to try them again. */
export function ReadGate<T>({ state, pending, title, children }: ReadGateProps<T>) {
  switch (state.kind) {
    case "loading":
      return pending;
    case "failed":
      return (
        <ErrorPanel title={title} message={state.failure}>
          <TryAgainKey onRetry={state.retry} />
        </ErrorPanel>
      );
    case "ready":
      return children(state.data);
  }
}
