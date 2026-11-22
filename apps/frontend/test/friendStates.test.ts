import { expect, test } from "bun:test";
import {
  FRIEND_STATE_LABELS,
  friendStateLabel,
  nextFriendStates,
} from "../src/features/friends/presence/friendStates.ts";

test("the states told on opening replace whatever was known", () => {
  expect(
    nextFriendStates(
      { old: "online" },
      {
        type: "friendStates",
        friends: [
          { playerId: "bob", state: "inDuel" },
          { playerId: "cid", state: "offline" },
        ],
      },
    ),
  ).toEqual({ bob: "inDuel", cid: "offline" });
});

test("a Friend's change of state replaces theirs only", () => {
  expect(
    nextFriendStates(
      { bob: "online", cid: "offline" },
      { type: "friendState", playerId: "cid", state: "inDuel" },
    ),
  ).toEqual({ bob: "online", cid: "inDuel" });
});

test("a removed Friend's state is forgotten", () => {
  expect(
    nextFriendStates({ bob: "online", cid: "offline" }, { type: "friendRemoved", playerId: "bob" }),
  ).toEqual({ cid: "offline" });
});

test("a change of state told before the states of opening is kept until they come", () => {
  expect(nextFriendStates(null, { type: "friendState", playerId: "bob", state: "online" })).toEqual(
    { bob: "online" },
  );
});

test("a message about Friend requests or the Online count leaves the states as they were", () => {
  const states = { bob: "online" } as const;
  expect(nextFriendStates(states, { type: "friendRequestReceived", playerId: "cid" })).toBe(states);
  expect(nextFriendStates(null, { type: "onlineCount", count: 3 })).toBeNull();
});

test("each state reads as the Player sees it, a Friend never told of reading as offline", () => {
  expect(friendStateLabel("online")).toBe("Online");
  expect(friendStateLabel("inDuel")).toBe("In a Duel");
  expect(friendStateLabel("offline")).toBe("Offline");
  expect(friendStateLabel(undefined)).toBe("Offline");
  for (const state of ["online", "inDuel", "offline", undefined] as const)
    expect(FRIEND_STATE_LABELS).toContain(friendStateLabel(state));
});
