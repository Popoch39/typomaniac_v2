import { expect, test } from "bun:test";
import {
  type Challenges,
  NO_CHALLENGES,
  acceptingChallenge,
  answeredChallenge,
  challengeDropped,
  challengeSending,
  nextChallenges,
  withdrawnChallenge,
} from "../src/features/challenge/outcome/nextChallenges.ts";

const ada = {
  id: "ada",
  nickname: "Ada",
  avatarUrl: null,
  rank: null,
  ornament: null,
} as const;
const bob = { id: "bob", nickname: "Bob" } as const;

// Waiting for Bob since 1000 on the client's clock.
const waiting: Challenges = {
  ...NO_CHALLENGES,
  sent: { friend: bob, challengeId: "c1", window: { answerWithinMs: 60_000, receivedAt: 1000 } },
};

// Ada's Challenge, received at 1000.
const received: Challenges = {
  ...NO_CHALLENGES,
  received: [
    {
      challengeId: "c9",
      challenger: ada,
      window: { answerWithinMs: 60_000, receivedAt: 1000 },
      isAccepting: false,
    },
  ],
};

test("a Challenge being sent waits for the server, then counts down from what it said", () => {
  const sending = challengeSending(NO_CHALLENGES, bob);
  expect(sending.sent).toEqual({ friend: bob, challengeId: null, window: null });
  const sent = nextChallenges(
    sending,
    { type: "challengeSent", challengeId: "c1", playerId: "bob", answerWithinMs: 60_000 },
    1000,
  );
  expect(sent).toEqual(waiting);
});

test("a refused Challenge leaves nothing waiting and says why, naming the Friend", () => {
  const sending = challengeSending(NO_CHALLENGES, bob);
  const say = (code: "NOT_FRIENDS" | "FRIEND_OFFLINE" | "CHALLENGE_PENDING" | "RATE_LIMITED") =>
    nextChallenges(sending, { type: "challengeRefused", playerId: "bob", code }, 0);
  expect(say("NOT_FRIENDS")).toEqual({ ...NO_CHALLENGES, notice: "Bob is no longer your Friend." });
  expect(say("FRIEND_OFFLINE").notice).toBe("Bob is offline: they cannot be challenged now.");
  expect(say("CHALLENGE_PENDING").notice).toBe(
    "You already have a Challenge waiting. Cancel it to challenge Bob.",
  );
  expect(say("RATE_LIMITED").notice).toBe(
    "You are challenging too fast. Wait a moment, then try again.",
  );
});

test("a declined or expired Challenge leaves nothing waiting and tells the challenger", () => {
  expect(
    nextChallenges(waiting, { type: "challengeDeclined", challengeId: "c1", playerId: "bob" }, 0),
  ).toEqual({ ...NO_CHALLENGES, notice: "Bob declined your Challenge." });
  expect(nextChallenges(waiting, { type: "challengeExpired", challengeId: "c1" }, 0)).toEqual({
    ...NO_CHALLENGES,
    notice: "Bob did not answer your Challenge in time.",
  });
  expect(nextChallenges(waiting, { type: "challengeCancelled", challengeId: "c1" }, 0)).toEqual({
    ...NO_CHALLENGES,
    notice: "Your Challenge to Bob was cancelled.",
  });
});

test("a Challenge the Player withdrew is gone at once, and its cancellation says nothing", () => {
  const withdrawn = withdrawnChallenge(waiting);
  expect(withdrawn).toEqual(NO_CHALLENGES);
  expect(nextChallenges(withdrawn, { type: "challengeCancelled", challengeId: "c1" }, 0)).toEqual(
    NO_CHALLENGES,
  );
});

test("an accepted Challenge leads the challenger, and the tab that accepted, into its Duel", () => {
  const accepted = { type: "challengeAccepted", challengeId: "c1", duelId: "d1" } as const;
  expect(nextChallenges(waiting, accepted, 0)).toEqual({ ...NO_CHALLENGES, duelId: "d1" });
  const accepting = acceptingChallenge(received, "c9");
  expect(accepting.received[0]?.isAccepting).toBe(true);
  expect(
    nextChallenges(accepting, { type: "challengeAccepted", challengeId: "c9", duelId: "d2" }, 0),
  ).toEqual({ ...NO_CHALLENGES, duelId: "d2" });
});

test("a Challenge accepted for another tab of the challenger leads this one nowhere", () => {
  expect(
    nextChallenges(
      NO_CHALLENGES,
      { type: "challengeAccepted", challengeId: "c1", duelId: "d1" },
      0,
    ),
  ).toEqual(NO_CHALLENGES);
});

test("received Challenges pile up, each once, and leave when answered, withdrawn or expired", () => {
  const other = { ...ada, id: "cid", nickname: "Cid" };
  const twice = [
    { type: "challengeReceived", challengeId: "c9", challenger: ada, answerWithinMs: 60_000 },
    { type: "challengeReceived", challengeId: "c8", challenger: other, answerWithinMs: 30_000 },
    { type: "challengeReceived", challengeId: "c8", challenger: other, answerWithinMs: 30_000 },
  ] as const;
  const piled = twice.reduce(
    (state, message) => nextChallenges(state, message, 1000),
    NO_CHALLENGES,
  );
  expect(piled.received.map(({ challengeId }) => challengeId)).toEqual(["c9", "c8"]);
  expect(piled.received[1]?.window).toEqual({ answerWithinMs: 30_000, receivedAt: 1000 });
  for (const type of [
    "challengeAnsweredElsewhere",
    "challengeCancelled",
    "challengeExpired",
  ] as const)
    expect(
      nextChallenges(piled, { type, challengeId: "c8" }, 0).received.map(
        ({ challengeId }) => challengeId,
      ),
    ).toEqual(["c9"]);
  expect(answeredChallenge(piled, "c9").received.map(({ challengeId }) => challengeId)).toEqual([
    "c8",
  ]);
});

test("a dropped connection ends the Challenge this tab sent, which the server cancelled", () => {
  expect(challengeDropped(waiting)).toEqual({
    ...NO_CHALLENGES,
    notice: "Your Challenge to Bob was cancelled: the connection dropped.",
  });
  expect(challengeDropped(received)).toEqual(received);
});

test("messages about other Players' Challenges change nothing", () => {
  expect(
    nextChallenges(waiting, { type: "challengeDeclined", challengeId: "c7", playerId: "cid" }, 0),
  ).toEqual(waiting);
  expect(nextChallenges(waiting, { type: "onlineCount", count: 3 }, 0)).toEqual(waiting);
});
