import { expect, test } from "bun:test";
import { loadingOnly, readStage } from "../src/shared/api/readStage.ts";

const read = { isPending: false, isError: false, isFetching: false };
const pending = { isPending: true, isError: false, isFetching: true };
const failed = { isPending: false, isError: true, isFetching: false };
const retrying = { isPending: false, isError: true, isFetching: true };

test("reads that all came back are ready", () => {
  expect(readStage([read, read])).toBe("ready");
});

test("a read still pending keeps the page loading", () => {
  expect(readStage([read, pending])).toBe("loading");
});

test("a failed read fails the page, even while another one is still pending", () => {
  expect(readStage([pending, failed])).toBe("failed");
});

test("a failed read being tried again loads again", () => {
  expect(readStage([retrying, read])).toBe("loading");
});

test("a read whose failure another part shows never fails the page", () => {
  expect(readStage([read, loadingOnly(failed)])).toBe("ready");
});

test("a read whose failure another part shows still keeps the page loading while it is read", () => {
  expect(readStage([read, loadingOnly(pending)])).toBe("loading");
  expect(readStage([read, loadingOnly(retrying)])).toBe("loading");
});
