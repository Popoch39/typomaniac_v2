import { expect, test } from "bun:test";
import { ADD_FRIEND_LABELS, addFriendKey } from "../src/features/friends/relation/addFriendKey.ts";

test("a Player with no link to the requester can be added", () => {
  expect(addFriendKey({ relation: "none", isPending: false })).toEqual({
    label: "Add Friend",
    act: "send",
  });
});

test("a Player who sent the requester a Friend request can be accepted", () => {
  expect(addFriendKey({ relation: "requestReceived", isPending: false })).toEqual({
    label: "Accept request",
    act: "accept",
  });
});

test("a Friend, and a Player already asked, offer nothing to press", () => {
  expect(addFriendKey({ relation: "friend", isPending: false })).toEqual({
    label: "Friends",
    act: null,
  });
  expect(addFriendKey({ relation: "requestSent", isPending: false })).toEqual({
    label: "Request sent",
    act: null,
  });
});

test("while the request is sent or accepted, the key says so and cannot be pressed again", () => {
  expect(addFriendKey({ relation: "none", isPending: true })).toEqual({
    label: "Sending…",
    act: null,
  });
  expect(addFriendKey({ relation: "requestReceived", isPending: true })).toEqual({
    label: "Accepting…",
    act: null,
  });
});

test("every label the key can show is listed, so that it keeps the size of the longest", () => {
  const relations = ["none", "requestReceived", "requestSent", "friend"] as const;
  for (const relation of relations)
    for (const isPending of [false, true])
      expect(ADD_FRIEND_LABELS).toContain(addFriendKey({ relation, isPending }).label);
});
