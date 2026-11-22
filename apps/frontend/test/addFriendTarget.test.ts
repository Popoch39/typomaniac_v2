import { expect, test } from "bun:test";
import {
  addFriendTarget,
  relationLookupOf,
} from "../src/features/friends/relation/addFriendTarget.ts";

const viewer = { nickname: "Alice" };
const relations = [
  { id: "p-bob", nickname: "Bob", relation: "none" },
  { id: "p-carol", nickname: "carol", relation: "friend" },
] as const;

test("the Nicknames of the other Players shown are looked up once each, whatever their case", () => {
  expect(relationLookupOf(viewer, ["Bob", "carol", "BOB", null, "dave"])).toEqual([
    "Bob",
    "carol",
    "dave",
  ]);
});

test("nothing is looked up for a Guest, a Player without a Nickname, or only oneself", () => {
  expect(relationLookupOf(null, ["Bob"])).toBeNull();
  expect(relationLookupOf({ nickname: null }, ["Bob"])).toBeNull();
  expect(relationLookupOf(viewer, ["alice", null])).toBeNull();
});

test("a Guest Opponent's name is never looked up, since no Nickname holds a space", () => {
  expect(relationLookupOf(viewer, ["Guest 1234"])).toBeNull();
});

test("another Player gets the key of their relation, matched whatever the case", () => {
  expect(addFriendTarget({ viewer, nickname: "BOB", relations })).toEqual({
    kind: "key",
    player: { id: "p-bob", relation: "none" },
  });
  expect(addFriendTarget({ viewer, nickname: "Carol", relations })).toEqual({
    kind: "key",
    player: { id: "p-carol", relation: "friend" },
  });
});

test("while the relations are being read, the key's place waits", () => {
  expect(addFriendTarget({ viewer, nickname: "Bob", relations: undefined })).toEqual({
    kind: "waiting",
  });
});

test("no key on oneself, a Guest Opponent, a Player the lookup left out, nor for a Guest viewer", () => {
  for (const [who, nickname] of [
    [viewer, "ALICE"],
    [viewer, "Guest 1234"],
    [viewer, "dave"],
    [viewer, null],
    [null, "Bob"],
    [{ nickname: null }, "Bob"],
  ] as const)
    expect(addFriendTarget({ viewer: who, nickname, relations })).toEqual({ kind: "none" });
});
