import { afterAll, afterEach, expect, test } from "bun:test";
import type { FinishedRound, ServerMessage } from "@repo/duel-engine";
import { applyEvent, createGame, getResult } from "@repo/typing-engine";

// What the server does with each connection it accepts, in order: send these messages, then close
// it with a code, or keep it open.
type Script = { readonly messages: readonly ServerMessage[]; readonly closeWith: number | null };
const scripts: Script[] = [];

const server = Bun.serve({
  port: 0,
  fetch: (request, current) =>
    current.upgrade(request, { data: undefined }) ? undefined : new Response(null, { status: 400 }),
  websocket: {
    open(ws) {
      const { messages, closeWith } = scripts.shift() ?? { messages: [], closeWith: null };
      for (const message of messages) ws.send(JSON.stringify(message));
      if (closeWith !== null) ws.close(closeWith);
    },
    message() {},
  },
});
afterAll(() => server.stop(true));

// The Duel socket is opened on the page's own host, which is this server here.
Object.defineProperty(globalThis, "window", {
  value: { location: new URL(`http://localhost:${server.port}/`) },
});
const { useDuelStore } = await import("../src/features/duel/store/useDuelStore.ts");
const store = useDuelStore;

afterEach(() => store.getState().leave());

/** Resolves once the store's state passes `predicate`. */
const until = (predicate: (state: ReturnType<typeof store.getState>) => boolean) =>
  new Promise<void>((resolve) => {
    if (predicate(store.getState())) return resolve();
    const stop = store.subscribe((state) => {
      if (!predicate(state)) return;
      stop();
      resolve();
    });
  });

const words = ["cat ", "dog ", "fox "];
const finished = applyEvent(
  applyEvent(createGame({ mode: "time", seconds: 1 }, ["cat"]), { type: "start", at: 0 }),
  { type: "tick", at: 1000 },
);
const firstRound: FinishedRound = {
  results: [getResult(finished), getResult(finished)],
  multipliers: [1, 1],
  outcomes: ["win", "loss"],
};
// Seated in the first Round of a Custom Duel, its Countdown announced and no key typed yet.
const midRound: ServerMessage = {
  type: "state",
  seat: 0,
  round: 1,
  rounds: [],
  startAt: Date.now() + 60_000,
  words,
  participants: [],
  ranks: null,
  journals: [[], []],
};
const countdown: ServerMessage = {
  type: "countdown",
  round: 1,
  startAt: Date.now() + 60_000,
  words,
};
// A server restart: the socket is reopened.
const dropped: Script = { messages: [midRound, countdown], closeWith: 1012 };

test("a Participant back mid-Round is no longer reconnecting once the Round end comes", async () => {
  scripts.push(dropped, {
    messages: [midRound, { type: "roundEnd", round: 1, nextStartAt: null, ...firstRound }],
    closeWith: null,
  });

  store.getState().join("duel-round-end");
  await until(({ phase }) => phase === "roundEnd");

  expect(store.getState().isReconnecting).toBe(false);
});

test("a Participant back mid-Round is no longer reconnecting once the Duel end comes", async () => {
  scripts.push(dropped, {
    messages: [
      midRound,
      { type: "end", outcomes: ["win", "loss"], rounds: [firstRound], ranked: null },
    ],
    closeWith: null,
  });

  store.getState().join("duel-end");
  await until(({ phase }) => phase === "finished");

  expect(store.getState().isReconnecting).toBe(false);
});
