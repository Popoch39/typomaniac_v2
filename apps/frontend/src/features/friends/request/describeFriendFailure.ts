import { describeApiError } from "../../../shared/api/describeApiError.ts";

const FAILURES = {
  ALREADY_FRIENDS: "You are already Friends.",
  REQUEST_PENDING: "Your Friend request is already waiting.",
  SELF: "You cannot add yourself as a Friend.",
  // A Player found by the search may have been banned, or gone, since.
  PLAYER_NOT_FOUND: "This Player can no longer be added.",
  FRIEND_LIMIT: "One of you already has 200 Friends, the most allowed.",
  PENDING_LIMIT:
    "You have 50 Friend requests waiting, the most allowed. Cancel one to send another.",
  REQUEST_NOT_FOUND: "This Friend request is no longer waiting.",
  FRIEND_NOT_FOUND: "You are no longer Friends.",
};

/** Why a Friend request, an answer to one or a Friend's removal failed, in a sentence. */
export function describeFriendFailure(error: unknown) {
  return describeApiError(error, FAILURES);
}
