import { afterAll, afterEach, expect, test } from "bun:test";
import { clientTime } from "../src/features/game/clock/clientTime.ts";
import { parseServerMessage } from "../src/features/duel/message/parseServerMessage.ts";
import { useDuelClockStore } from "../src/features/duel/store/useDuelClockStore.ts";
import { useDuelCountdownStore } from "../src/features/duel/store/useDuelCountdownStore.ts";
import { createReconnectingSocket } from "../src/shared/lib/reconnectingSocket.ts";

// The server's clock runs this far ahead of the client's.
const SKEW_MS = 1000;

// What the server does with the n-th ping of a connection, counted from 0: answer it after
// `delay` milliseconds, on a clock `skew` milliseconds ahead, or never answer it.
type Answer = { readonly delay: number; readonly skew: number } | null;
let answerOf: (n: number) => Answer = () => ({ delay: 0, skew: SKEW_MS });

const server = Bun.serve({
  port: 0,
  fetch: (request, current) =>
    current.upgrade(request, { data: { pings: 0 } })
      ? undefined
      : new Response(null, { status: 400 }),
  websocket: {
    data: {} as { pings: number },
    open(ws) {
      ws.send(JSON.stringify({ type: "presence", participant: { seat: 0 } }));
    },
    message(ws, data) {
      const { clientAt } = JSON.parse(String(data)) as { clientAt: number };
      const answer = answerOf(ws.data.pings);
      ws.data.pings += 1;
      if (answer === null) return;
      const pong = () =>
        ws.send(JSON.stringify({ type: "pong", clientAt, serverAt: clientAt + answer.skew }));
      if (answer.delay === 0) pong();
      else setTimeout(pong, answer.delay);
    },
  },
});
const url = `ws://localhost:${server.port}`;

const socket = createReconnectingSocket();
let reconnects = 0;

// Opens the socket the Duel store would, handing each pong to the clock, once the first message is read.
async function openSocket() {
  let greet: () => void = () => undefined;
  const greeted = new Promise<void>((resolve) => {
    greet = resolve;
  });
  socket.open(url, {
    receive: (data) => {
      const message = parseServerMessage(data);
      if (message?.type === "pong") useDuelClockStore.getState().receivePong(message);
      greet();
    },
    findRefusal: () => Promise.resolve("refused"),
    refuse: () => undefined,
    reconnect: () => {
      reconnects += 1;
      return false;
    },
    disconnect: () => undefined,
  });
  await greeted;
  return { send: (message: object) => socket.send(JSON.stringify(message)), drop: socket.drop };
}

async function until(condition: () => boolean, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (!condition() && Date.now() < deadline) await Bun.sleep(10);
}

afterEach(() => {
  socket.close();
  useDuelCountdownStore.getState().cancel();
  useDuelClockStore.getState().reset();
  answerOf = () => ({ delay: 0, skew: SKEW_MS });
  reconnects = 0;
});
afterAll(() => server.stop(true));

test("a lost pong is sent again, so the clock still synchronises and the Countdown runs", async () => {
  answerOf = (n) => (n === 0 ? null : { delay: 0, skew: SKEW_MS });
  const link = await openSocket();
  let started = false;
  // Announced in server time, a little after the clock can have synchronised.
  useDuelCountdownStore.getState().schedule(clientTime() + SKEW_MS + 2500, () => {
    started = true;
  });

  useDuelClockStore.getState().synchronise(link);
  await until(() => started, 4000);

  expect(useDuelClockStore.getState().clockOffset).toBeCloseTo(SKEW_MS, -1);
  expect(started).toBe(true);
}, 10_000);

test("a pong from an earlier sync is ignored, so it neither shifts the clock nor restarts the Countdown", async () => {
  // Only the first ping is answered at once, by a server clock far off: an earlier sync's late reply.
  answerOf = (n) => (n === 0 ? { delay: 0, skew: 50_000 } : { delay: 20, skew: SKEW_MS });
  const link = await openSocket();
  const startAt = clientTime() + SKEW_MS + 1500;
  let starts = 0;
  useDuelCountdownStore.getState().schedule(startAt, () => {
    starts += 1;
  });
  const offsets: (number | null)[] = [];
  const stopWatching = useDuelClockStore.subscribe(({ clockOffset }, previous) => {
    if (clockOffset !== previous.clockOffset) offsets.push(clockOffset);
  });

  useDuelClockStore.getState().synchronise(link);
  useDuelClockStore.getState().synchronise(link);
  await until(() => starts > 0, 3000);
  await Bun.sleep(200);
  stopWatching();

  expect(offsets).toHaveLength(1);
  expect(offsets[0]).toBeCloseTo(SKEW_MS, -2);
  expect(starts).toBe(1);
}, 10_000);

test("a server that never answers a ping has the socket reopened, after a few tries", async () => {
  answerOf = () => null;
  const link = await openSocket();

  useDuelClockStore.getState().synchronise(link);
  await Bun.sleep(1500);
  expect(reconnects).toBe(0);
  await until(() => reconnects > 0, 4000);

  expect(reconnects).toBe(1);
  expect(useDuelClockStore.getState().clockOffset).toBeNull();
}, 10_000);
