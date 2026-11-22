import { expect, test } from "bun:test";
import { readGate } from "../src/shared/api/readStage.ts";

const retry = () => undefined;

test("a gate whose reads are back hands over their data", () => {
  expect(readGate("ready", { rank: 3 }, null, retry)).toEqual({ kind: "ready", data: { rank: 3 } });
});

test("a read that came back empty is data, not a missing read", () => {
  expect(readGate("ready", null, null, retry)).toEqual({ kind: "ready", data: null });
});

test("a gate still reading shows its pending view", () => {
  expect(readGate("loading", undefined, null, retry)).toEqual({ kind: "loading" });
});

test("a failed read offers its failure and a way to try again", () => {
  expect(readGate("failed", undefined, "The server is unreachable.", retry)).toEqual({
    kind: "failed",
    failure: "The server is unreachable.",
    retry,
  });
});

test("a gate is never ready before its data is there", () => {
  expect(readGate("ready", undefined, null, retry)).toEqual({ kind: "loading" });
});

test("a failure with nothing to say is still shown, in general words, with a way to try again", () => {
  expect(readGate("failed", undefined, null, retry)).toEqual({
    kind: "failed",
    failure: "Something went wrong. Try again.",
    retry,
  });
});
