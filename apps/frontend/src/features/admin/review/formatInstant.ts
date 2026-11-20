/** An instant as the administration page shows it, in the reader's time zone unless one is given. */
export function formatInstant(epochMs: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(epochMs);
}
