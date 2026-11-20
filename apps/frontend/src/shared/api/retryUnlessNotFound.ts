import { EdenFetchError } from "@elysia/eden";

/**
 * An unknown Nickname stays unknown: asking again would only hold its message back. Otherwise as many
 * tries as Query's default.
 */
export const retryUnlessNotFound = (failureCount: number, error: Error) =>
  !(error instanceof EdenFetchError && error.status === 404) && failureCount < 3;
