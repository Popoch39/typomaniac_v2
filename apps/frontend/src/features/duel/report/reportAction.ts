import { EdenFetchError } from "@elysia/eden";
import { describeApiError } from "../../../shared/api/describeApiError.ts";

/** Every label the action takes, so that its key keeps the size of the longest whatever it shows. */
export const REPORT_LABELS = ["Report Opponent", "Reporting…", "Report received"] as const;

const FAILURES = { DUEL_NOT_FOUND: "This Duel can no longer be reported." };

const alreadyMade = (error: unknown) =>
  error instanceof EdenFetchError &&
  typeof error.value === "object" &&
  error.value !== null &&
  "code" in error.value &&
  error.value.code === "REPORT_ALREADY_MADE";

/**
 * What the Report action of a ranked Duel end shows, from the state of its request. A Report the
 * server already holds, made from another tab, is confirmed like a new one: either way it was received.
 */
export function reportAction({
  isPending,
  isSuccess,
  error,
}: {
  isPending: boolean;
  isSuccess: boolean;
  error: unknown;
}) {
  if (isSuccess || alreadyMade(error))
    return { label: "Report received", made: true, failure: null };
  if (isPending) return { label: "Reporting…", made: false, failure: null };
  return {
    label: "Report Opponent",
    made: false,
    failure: error === null ? null : describeApiError(error, FAILURES),
  };
}
