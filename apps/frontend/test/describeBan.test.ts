import { expect, test } from "bun:test";
import { describeBan } from "../src/features/fair-play/notice/describeBan.ts";

test("a banned Player is told they can no longer sign in, and where to contest the Ban", () => {
  expect(describeBan("appeal@typomaniac.test")).toEqual({
    summary:
      "You are banned: you can no longer sign in, with this GitHub or Discord account or with this e-mail.",
    appealAddress: "appeal@typomaniac.test",
    appealLink: "mailto:appeal@typomaniac.test",
  });
});
