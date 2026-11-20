import { EdenFetchError } from "@elysia/eden";

const MEANWHILE = "Practice and Custom Duels are open meanwhile.";

/**
 * Why the Queue is closed to a Player whose GitHub or Discord account is too young, or of an age not
 * recorded yet, in words for them, read from what reading the Queue failed with; `null` when the
 * Queue was not refused for that. `timeZone` defaults to the browser's.
 */
export function accountAgeRefusalOf(error: unknown, timeZone?: string): string | null {
  if (!(error instanceof EdenFetchError)) return null;
  const { value }: { value: unknown } = error;
  if (typeof value !== "object" || value === null || !("code" in value)) return null;
  if (value.code === "ACCOUNT_AGE_UNKNOWN") {
    return `Sign out and sign in again to play ranked, so the age of your GitHub or Discord account can be read. ${MEANWHILE}`;
  }
  if (value.code !== "ACCOUNT_TOO_YOUNG") return null;
  if (!("opensAt" in value) || typeof value.opensAt !== "number") return null;
  const opensAt = new Date(value.opensAt);
  const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone }).format(opensAt);
  const time = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone }).format(opensAt);
  return `Ranked opens for you on ${day} at ${time}, once your GitHub or Discord account is 7 days old. ${MEANWHILE}`;
}
