import { useState } from "react";
import { describeApiError } from "../../../shared/api/describeApiError.ts";

/** An inline error that its key shows and clears in turn, so that both can be watched for shifts. */
export function useDevInlineFailure() {
  const [hasFailed, setHasFailed] = useState(true);
  return {
    failure: hasFailed ? describeApiError(null) : null,
    toggle: () => setHasFailed((failed) => !failed),
  };
}
