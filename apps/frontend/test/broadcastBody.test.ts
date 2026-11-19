import { expect, test } from "bun:test";
import { broadcastBody } from "../src/features/duel/phase/broadcastBody.ts";

test("the Countdown and a running Round have their own bodies", () => {
  expect(broadcastBody("countdown", false)).toBe("countdown");
  expect(broadcastBody("running", false)).toBe("live");
});

test("the end of a Round that does not decide the Duel shows the Round end", () => {
  expect(broadcastBody("roundEnd", false)).toBe("roundEnd");
});

test("the end of the deciding Round already shows the Duel end, before the server ends the Duel", () => {
  expect(broadcastBody("roundEnd", true)).toBe("duelEnd");
});

test("a finished Duel shows the Duel end", () => {
  expect(broadcastBody("finished", true)).toBe("duelEnd");
  expect(broadcastBody("finished", false)).toBe("duelEnd");
});
