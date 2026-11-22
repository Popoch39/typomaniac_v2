import { expect, test } from "bun:test";
import { parsePlayerMessage } from "../src/features/online/message/parsePlayerMessage.ts";

test("an Online count is read back as it was sent", () => {
  expect(parsePlayerMessage(JSON.stringify({ type: "onlineCount", count: 12 }))).toEqual({
    type: "onlineCount",
    count: 12,
  });
});

test("an Online count of nobody is read back", () => {
  expect(parsePlayerMessage(JSON.stringify({ type: "onlineCount", count: 0 }))).toEqual({
    type: "onlineCount",
    count: 0,
  });
});

test("an Online count that is not a whole number of Players is not read", () => {
  for (const count of [-1, 1.5, "3", null, undefined])
    expect(parsePlayerMessage(JSON.stringify({ type: "onlineCount", count }))).toBeNull();
});

test("a frame of an unknown type, of no type, or that is not JSON is not read", () => {
  expect(parsePlayerMessage(JSON.stringify({ type: "challenged", count: 1 }))).toBeNull();
  expect(parsePlayerMessage(JSON.stringify({ count: 1 }))).toBeNull();
  expect(parsePlayerMessage(JSON.stringify([1]))).toBeNull();
  expect(parsePlayerMessage("not json")).toBeNull();
});

test("the states of the Friends, told on opening, are read back", () => {
  const message = {
    type: "friendStates",
    friends: [
      { playerId: "bob", state: "online" },
      { playerId: "cid", state: "inDuel" },
      { playerId: "dan", state: "offline" },
    ],
  } as const;
  expect(parsePlayerMessage(JSON.stringify(message))).toEqual(message);
  expect(parsePlayerMessage(JSON.stringify({ type: "friendStates", friends: [] }))).toEqual({
    type: "friendStates",
    friends: [],
  });
});

test("a Friend's change of state is read back", () => {
  for (const state of ["online", "inDuel", "offline"] as const)
    expect(
      parsePlayerMessage(JSON.stringify({ type: "friendState", playerId: "bob", state })),
    ).toEqual({ type: "friendState", playerId: "bob", state });
});

test("a state that is not one of a Friend's, or a Friend without an id, is not read", () => {
  expect(
    parsePlayerMessage(JSON.stringify({ type: "friendState", playerId: "bob", state: "away" })),
  ).toBeNull();
  expect(parsePlayerMessage(JSON.stringify({ type: "friendState", state: "online" }))).toBeNull();
  expect(
    parsePlayerMessage(
      JSON.stringify({ type: "friendStates", friends: [{ playerId: 1, state: "online" }] }),
    ),
  ).toBeNull();
  expect(parsePlayerMessage(JSON.stringify({ type: "friendStates", friends: null }))).toBeNull();
});

test("each change to the Player's Friends and Friend requests is read back with the other Player", () => {
  const types = [
    "friendRequestReceived",
    "friendRequestSent",
    "friendRequestAccepted",
    "friendRequestRemoved",
    "friendRemoved",
  ] as const;
  for (const type of types) {
    expect(parsePlayerMessage(JSON.stringify({ type, playerId: "bob" }))).toEqual({
      type,
      playerId: "bob",
    });
    expect(parsePlayerMessage(JSON.stringify({ type }))).toBeNull();
  }
});

const challenger = {
  id: "ada",
  nickname: "Ada",
  avatarUrl: null,
  rank: { tier: "gold", division: 2, lp: 40 },
  ornament: { tier: "gold", division: null },
} as const;

test("each Challenge message is read back as it was sent", () => {
  const messages = [
    { type: "challengeSent", challengeId: "c1", playerId: "bob", answerWithinMs: 60_000 },
    { type: "challengeRefused", playerId: "bob", code: "FRIEND_OFFLINE" },
    { type: "challengeRefused", playerId: "bob", code: "FRIEND_BUSY" },
    { type: "challengeRefused", playerId: "bob", code: "IN_DUEL" },
    { type: "challengeReceived", challengeId: "c1", challenger, answerWithinMs: 59_000 },
    {
      type: "challengeReceived",
      challengeId: "c2",
      challenger: {
        ...challenger,
        avatarUrl: "https://a.example/ada.png",
        rank: null,
        ornament: null,
      },
      answerWithinMs: 0,
    },
    { type: "challengeAccepted", challengeId: "c1", duelId: "d1" },
    { type: "challengeDeclined", challengeId: "c1", playerId: "bob" },
    { type: "challengeAnsweredElsewhere", challengeId: "c1" },
    { type: "challengeCancelled", challengeId: "c1" },
    { type: "challengeExpired", challengeId: "c1" },
  ] as const;
  for (const message of messages)
    expect(parsePlayerMessage(JSON.stringify(message))).toEqual(message);
});

test("a Challenge message missing what it carries, or refused for an unknown reason, is not read", () => {
  const unread = [
    { type: "challengeSent", challengeId: "c1", playerId: "bob" },
    { type: "challengeRefused", playerId: "bob", code: "BUSY_TYPING" },
    { type: "challengeReceived", challengeId: "c1", answerWithinMs: 1000 },
    {
      type: "challengeReceived",
      challengeId: "c1",
      challenger: { ...challenger, rank: { tier: "gold", lp: 40 } },
      answerWithinMs: 1000,
    },
    { type: "challengeReceived", challengeId: "c1", challenger, answerWithinMs: -1 },
    { type: "challengeAccepted", challengeId: "c1" },
    { type: "challengeDeclined", challengeId: "c1" },
    { type: "challengeCancelled" },
    { type: "challengeExpired", challengeId: 1 },
  ];
  for (const message of unread) expect(parsePlayerMessage(JSON.stringify(message))).toBeNull();
});
