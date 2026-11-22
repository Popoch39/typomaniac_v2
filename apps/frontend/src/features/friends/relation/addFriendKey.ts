/** What links the signed-in Player to another Player, as the Friend routes tell it. */
export type Relation = "friend" | "requestSent" | "requestReceived" | "none";

/** Every label the key takes, so that it keeps the size of the longest whatever it shows. */
export const ADD_FRIEND_LABELS = [
  "Add Friend",
  "Sending…",
  "Request sent",
  "Accept request",
  "Accepting…",
  "Friends",
] as const;

type AddFriendKey = {
  label: (typeof ADD_FRIEND_LABELS)[number];
  /** What pressing the key does; null when there is nothing to press. */
  act: "send" | "accept" | null;
};

/** The key offered on another Player, from the relation to them and whether its request is under way. */
export function addFriendKey({
  relation,
  isPending,
}: {
  relation: Relation;
  isPending: boolean;
}): AddFriendKey {
  switch (relation) {
    case "friend":
      return { label: "Friends", act: null };
    case "requestSent":
      return { label: "Request sent", act: null };
    case "requestReceived":
      return isPending
        ? { label: "Accepting…", act: null }
        : { label: "Accept request", act: "accept" };
    case "none":
      return isPending ? { label: "Sending…", act: null } : { label: "Add Friend", act: "send" };
  }
}
