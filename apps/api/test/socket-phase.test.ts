import { expect, test } from "bun:test";
import { nextSocketPhase, type SocketPhase } from "../src/modules/lifecycle/socketPhase.ts";

const opening: SocketPhase = { kind: "opening" };
const seated: SocketPhase = { kind: "seated" };
const closing: SocketPhase = { kind: "closing" };
const closed: SocketPhase = { kind: "closed" };

test("a socket whose open runs to its end is seated, and its close lets go of what the open took", () => {
  const afterOpen = nextSocketPhase(opening, { kind: "opened" });
  expect(afterOpen).toEqual({ phase: seated, effect: null });

  const afterClose = nextSocketPhase(afterOpen.phase, { kind: "close" });
  expect(afterClose).toEqual({ phase: closing, effect: "release" });

  expect(nextSocketPhase(afterClose.phase, { kind: "released" })).toEqual({
    phase: closed,
    effect: null,
  });
});

test("a socket closed while opening is let go of by its open, never by its close", () => {
  const afterClose = nextSocketPhase(opening, { kind: "close" });
  expect(afterClose).toEqual({ phase: closing, effect: null });

  expect(nextSocketPhase(afterClose.phase, { kind: "opened" })).toEqual({
    phase: closed,
    effect: null,
  });
});

test("a closed socket stays closed, whatever comes late", () => {
  for (const kind of ["opened", "close", "released"] as const)
    expect(nextSocketPhase(closed, { kind })).toEqual({ phase: closed, effect: null });
});
