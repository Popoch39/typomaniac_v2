import { afterEach, expect, test } from "bun:test";
import { clientTime } from "../src/features/game/clock/clientTime.ts";
import { useDuelClockStore } from "../src/features/duel/store/useDuelClockStore.ts";
import { useDuelCountdownStore } from "../src/features/duel/store/useDuelCountdownStore.ts";

afterEach(() => {
  useDuelCountdownStore.getState().cancel();
  useDuelClockStore.getState().reset();
});

test("a Countdown announced before the clock is known waits for the offset, unlike no Countdown", () => {
  expect(useDuelCountdownStore.getState().countdown.kind).toBe("idle");

  useDuelCountdownStore.getState().schedule(clientTime() + 3000, () => undefined);

  expect(useDuelCountdownStore.getState().countdown).toMatchObject({
    kind: "awaitingOffset",
    purpose: "start",
  });
});

// A server on this client's clock, answering each ping at once.
const echoLink = {
  send: (message: { readonly type: string; readonly clientAt?: number }) => {
    if (message.type !== "ping" || message.clientAt === undefined) return;
    useDuelClockStore
      .getState()
      .receivePong({ clientAt: message.clientAt, serverAt: message.clientAt });
  },
  drop: () => undefined,
};

test("a Countdown waiting for the offset counts down once the clock is known, then starts the Round", async () => {
  let starts = 0;
  useDuelCountdownStore.getState().schedule(clientTime() + 100, () => {
    starts += 1;
  });

  useDuelClockStore.getState().synchronise(echoLink);

  expect(useDuelCountdownStore.getState().countdown).toMatchObject({
    kind: "counting",
    secondsLeft: 1,
  });
  await Bun.sleep(200);
  expect(useDuelCountdownStore.getState().countdown.kind).toBe("idle");
  expect(starts).toBe(1);
});

test("a Countdown shown between two Rounds replaces the one under way and starts nothing at its end", async () => {
  useDuelClockStore.getState().synchronise(echoLink);
  let starts = 0;
  useDuelCountdownStore.getState().schedule(clientTime() + 5000, () => {
    starts += 1;
  });

  useDuelCountdownStore.getState().display(clientTime() + 50);

  expect(useDuelCountdownStore.getState().countdown).toMatchObject({
    kind: "counting",
    purpose: "display",
  });
  await Bun.sleep(150);
  expect(useDuelCountdownStore.getState().countdown.kind).toBe("idle");
  expect(starts).toBe(0);
});
