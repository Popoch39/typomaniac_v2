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
