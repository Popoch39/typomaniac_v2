import { expect, test } from "bun:test";
import { orderFriends } from "../src/features/friends/presence/orderFriends.ts";

const friend = (id: string) => ({ id });

test("Online Friends come first, then those In a Duel, then those offline, each keeping its order", () => {
  const friends = ["ada", "bob", "cid", "dan", "eve", "fay"].map(friend);
  const states = {
    ada: "offline",
    bob: "inDuel",
    cid: "online",
    dan: "offline",
    eve: "online",
    fay: "inDuel",
  } as const;

  expect(orderFriends(friends, states).map(({ id }) => id)).toEqual([
    "cid",
    "eve",
    "bob",
    "fay",
    "ada",
    "dan",
  ]);
});

test("a Friend whose state is not known yet is listed with the offline ones", () => {
  const friends = ["ada", "bob", "cid"].map(friend);

  expect(orderFriends(friends, { cid: "online" }).map(({ id }) => id)).toEqual([
    "cid",
    "ada",
    "bob",
  ]);
  expect(orderFriends(friends, null).map(({ id }) => id)).toEqual(["ada", "bob", "cid"]);
});
