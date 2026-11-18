import { EdenFetchError } from "@elysia/eden";

/** Words for each server `code` the app can meet, so no raw code ever reaches the screen. */
const BY_CODE: Readonly<Record<string, string>> = {
  UNAUTHORIZED: "Sign in to continue.",
  NICKNAME_REQUIRED: "Choose a Nickname to continue.",
  DUEL_NOT_FOUND: "This Duel does not exist or has expired. Ask for a new link.",
  DUEL_FULL: "This Duel is full: two Participants are already in it.",
};

const BY_STATUS: Readonly<Record<number, string>> = {
  401: "Sign in to continue.",
  403: "You are not allowed to do this.",
  404: "This could not be found.",
  429: "Too many attempts. Wait a moment and try again.",
};

const UNREACHABLE = "The server could not be reached. Check your connection and try again.";
const SERVER_FAILURE = "Something went wrong on our side. Try again in a moment.";
const UNKNOWN = "Something went wrong. Try again.";

const serverCode = (value: unknown) =>
  typeof value === "object" && value !== null && "code" in value && typeof value.code === "string"
    ? value.code
    : null;

/** What Better Auth's client resolves as `error`: a plain object rather than an Error. */
const isAuthError = (value: unknown): value is { status: number } =>
  typeof value === "object" &&
  value !== null &&
  "status" in value &&
  typeof value.status === "number" &&
  "statusText" in value;

const failureOf = (error: unknown) => {
  if (error instanceof EdenFetchError) return { status: error.status, value: error.value };
  if (isAuthError(error)) return { status: error.status, value: error };
  return null;
};

/**
 * Turns whatever an API call failed with into a sentence for the user. `byCode` words a server
 * code for the action at hand, in place of the general wording.
 */
export function describeApiError(
  error: unknown,
  byCode: Readonly<Record<string, string>> = {},
): string {
  const failure = failureOf(error);
  if (failure === null) return UNKNOWN;
  const code = serverCode(failure.value);
  const known = code === null ? undefined : (byCode[code] ?? BY_CODE[code]);
  if (known !== undefined) return known;
  // Eden reports a request that never got a response as a 503 carrying what fetch threw.
  if (failure.status === 0 || failure.value instanceof Error) return UNREACHABLE;
  if (failure.status >= 500) return SERVER_FAILURE;
  return BY_STATUS[failure.status] ?? UNKNOWN;
}
