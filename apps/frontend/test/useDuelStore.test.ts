import { afterAll, afterEach, expect, test } from "bun:test";
import {
  type ClientMessage,
  DUEL_GAME_CONFIG,
  type FinishedRound,
  type ServerMessage,
} from "@repo/duel-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";

// What the server does with each connection it accepts, in order: send these messages, then close
// it with a code, or keep it open.
type Script = { readonly messages: readonly ServerMessage[]; readonly closeWith: number | null };
const scripts: Script[] = [];
// The Events of seat 0 the server received, as its journal holds them.
const received: GameEvent[] = [];
let dropSeated: () => void = () => undefined;
const serverTime = () => performance.timeOrigin + performance.now();

const server = Bun.serve({
  port: 0,
  fetch: (request, current) =>
    current.upgrade(request, { data: undefined }) ? undefined : new Response(null, { status: 400 }),
  websocket: {
    open(ws) {
      // A server restart: the socket is reopened.
      dropSeated = () => ws.close(1012);
      const { messages, closeWith } = scripts.shift() ?? { messages: [], closeWith: null };
      for (const message of messages) ws.send(JSON.stringify(message));
      if (closeWith !== null) ws.close(closeWith);
    },
    message(ws, data) {
      const message = JSON.parse(String(data)) as ClientMessage;
      if (message.type === "ping")
        ws.send(
          JSON.stringify({ type: "pong", clientAt: message.clientAt, serverAt: serverTime() }),
        );
      if (message.type === "event") received.push(message.event);
    },
  },
});
afterAll(() => server.stop(true));

// The Duel socket is opened on the page's own host, which is this server here.
Object.defineProperty(globalThis, "window", {
  value: { location: new URL(`http://localhost:${server.port}/`) },
});
const { useDuelStore } = await import("../src/features/duel/store/useDuelStore.ts");
const { useGameStore } = await import("../src/features/game/store/useGameStore.ts");
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

/** Resolves once the Game's state passes `predicate`. */
const untilGame = (predicate: (state: ReturnType<typeof useGameStore.getState>) => boolean) =>
  new Promise<void>((resolve) => {
    if (predicate(useGameStore.getState())) return resolve();
    const stop = useGameStore.subscribe((state) => {
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

test("Keystrokes applied while reconnecting do not change the Game, which resumes as the server journal", async () => {
  received.length = 0;
  const startAt = serverTime() + 200;
  const announced: ServerMessage = { type: "countdown", round: 1, startAt, words };
  scripts.push({
    messages: [{ ...midRound, startAt: null, words: null }, announced],
    closeWith: null,
  });
  store.getState().join("duel-frozen-input");
  await untilGame(({ game }) => game.status === "running");
  useGameStore.getState().applyEvent({ type: "insert", at: serverTime(), text: "c" });
  while (!received.some(({ type }) => type === "insert")) await Bun.sleep(5);
  const journal = [...received];
  scripts.push({
    messages: [{ ...midRound, startAt, journals: [journal, []] }, announced],
    closeWith: null,
  });

  dropSeated();
  await until(({ isReconnecting }) => isReconnecting);
  const frozen = useGameStore.getState().game;
  useGameStore.getState().applyEvent({ type: "insert", at: serverTime(), text: "a" });

  expect(useGameStore.getState().game).toBe(frozen);

  await untilGame(({ game }) => game !== frozen);
  const replayed = journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words));
  expect(useGameStore.getState().game.inputs).toEqual(replayed.inputs);
  expect(useGameStore.getState().game.startedAt).toBe(replayed.startedAt);
});
