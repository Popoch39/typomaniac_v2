import type { ReactNode } from "react";

interface LoadingStateProps {
  /** What is being read, as screen readers hear it, such as "Reading the Leaderboard…". */
  message: string;
  /** The skeleton of the page, for sighted users only. */
  children?: ReactNode;
}

// The skeleton is hidden from assistive technology as a whole, so that its real titles are not read out
// as if the content were there: the status sentence alone tells what is happening.
export function LoadingState({ message, children }: LoadingStateProps) {
  return (
    <>
      <p role="status" className="sr-only">
        {message}
      </p>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </>
  );
}
