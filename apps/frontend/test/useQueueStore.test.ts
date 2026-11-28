import { afterAll, afterEach, expect, test } from "bun:test";
import type { PairingSide, QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import { useGameStore } from "../src/features/game/store/useGameStore.ts";

const players: { readonly self: PairingSide; readonly opponent: PairingSide } = {
  self: { nickname: "ada", avatarUrl: null, rank: null, ornament: null },
  opponent: { nickname: "bob", avatarUrl: null, rank: null, ornament: null },
};
const queued: QueueServerMessage = { type: "queued", queuedAt: 1_000, serverAt: 4_000 };
const proposed = (accepted: boolean): QueueServerMessage => ({
  type: "proposed",
  pairingId: "pairing-1",
  acceptWithinMs: 10_000,
  accepted,
  players,
});

// What the server does with each connection it accepts, in order: send these messages, then close
// it with a code, or keep it open.
type Script = {
  readonly messages: readonly QueueServerMessage[];
  readonly closeWith: number | null;
};
const scripts: Script[] = [];
// The messages the server received from the Player, in order.
const received: QueueClientMessage[] = [];
let openings = 0;
let current: Bun.ServerWebSocket<undefined> | null = null;

const server = Bun.serve({
  port: 0,
  fetch: (request, upgrading) =>
    upgrading.upgrade(request, { data: undefined })
      ? undefined
      : new Response(null, { status: 400 }),
  websocket: {
    open(ws) {
      openings += 1;
      current = ws;
      const { messages, closeWith } = scripts.shift() ?? { messages: [], closeWith: null };
      for (const message of messages) ws.send(JSON.stringify(message));
      if (closeWith !== null) ws.close(closeWith);
    },
    message(_ws, data) {
      received.push(JSON.parse(String(data)) as QueueClientMessage);
    },
  },
});
afterAll(() => server.stop(true));

// The Queue socket is opened on the page's own host, which is this server here. Another store test
// run before this one may have given the page its own server's host already, and one run after it
// may give it another.
const page = new URL(`http://localhost:${server.port}/`);
if (typeof window === "undefined")
  Object.defineProperty(globalThis, "window", { value: { location: page }, configurable: true });
else window.location.host = page.host;
const { setQueueDuelNavigation, useQueueStore } =
  await import("../src/features/queue/store/useQueueStore.ts");
const store = useQueueStore;
// The ranked Duels the store took the Player to, in order.
const wentToDuels: string[] = [];
setQueueDuelNavigation((duelId) => wentToDuels.push(duelId));

afterEach(() => {
  store.getState().leave();
  // A started Game ticks on a timer: a new ready Game stops it so no test leaves one running.
  useGameStore.getState().leave();
  scripts.length = 0;
  received.length = 0;
  wentToDuels.length = 0;
});

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

/** Sends `message` from the server on the socket it holds. */
function serverSends(message: QueueServerMessage) {
  current?.send(JSON.stringify(message));
}

test("a Player goes from queued to proposed, accepts, and is paired", async () => {
  scripts.push({ messages: [queued], closeWith: null });

  store.getState().enter();
  expect(store.getState().phase.kind).toBe("connecting");
  await until(({ phase }) => phase.kind === "queued");
  expect(store.getState().phase).toMatchObject({ kind: "queued", requeued: false });

  serverSends(proposed(false));
  await until(({ phase }) => phase.kind === "proposed");
  expect(store.getState().phase).toMatchObject({
    kind: "proposed",
    pairingId: "pairing-1",
    players,
    accepted: false,
  });

  store.getState().accept();
  expect(store.getState().phase).toMatchObject({ kind: "proposed", accepted: true });
  await until(() => received.length === 1);
  expect(received).toEqual([{ type: "accept", pairingId: "pairing-1" }]);

  serverSends({ type: "paired", duelId: "duel-1" });
  current?.close(1000);
  await until(({ phase }) => phase.kind === "paired");
  expect(store.getState().phase).toEqual({ kind: "paired", duelId: "duel-1" });
  expect(wentToDuels).toEqual(["duel-1"]);
});

test("a queued Player keeps their place while nothing tells them to leave", async () => {
  scripts.push({ messages: [queued], closeWith: null });

  store.getState().enter();
  await until(({ phase }) => phase.kind === "queued");
  const before = openings;
  // Past the first try a dropped socket would make to reopen.
  await Bun.sleep(1200);
  expect(store.getState().phase).toMatchObject({ kind: "queued", requeued: false });
  expect(openings).toBe(before);

  // The socket is still the one that holds the place: a Pairing still reaches the Player.
  serverSends(proposed(false));
  await until(({ phase }) => phase.kind === "proposed");
  expect(wentToDuels).toEqual([]);
});

test("a Player removed for not accepting is told why, and the socket is not reopened", async () => {
  scripts.push({
    messages: [queued, proposed(false), { type: "removed", reason: "notAccepted" }],
    closeWith: 1000,
  });

  store.getState().enter();
  await until(({ phase }) => phase.kind === "removed");
  const before = openings;
  // Past the first try a dropped socket would make to reopen.
  await Bun.sleep(1200);

  expect(store.getState().phase).toEqual({ kind: "removed", reason: "notAccepted" });
  expect(openings).toBe(before);
});

test("a removed Player who closes the notice is back to idle, the socket left closed", async () => {
  scripts.push({
    messages: [queued, { type: "removed", reason: "replaced" }],
    closeWith: 1000,
  });

  store.getState().enter();
  await until(({ phase }) => phase.kind === "removed");
  const before = openings;
  store.getState().dismiss();

  expect(store.getState().phase).toEqual({ kind: "idle" });
  // Past the first try a dropped socket would make to reopen.
  await Bun.sleep(1200);
  expect(openings).toBe(before);
});

test("a removed Player who enters again is back in the Queue on a new socket", async () => {
  scripts.push(
    { messages: [queued, { type: "removed", reason: "notAccepted" }], closeWith: 1000 },
    { messages: [queued], closeWith: null },
  );

  store.getState().enter();
  await until(({ phase }) => phase.kind === "removed");
  const before = openings;
  store.getState().enter();
  await until(({ phase }) => phase.kind === "queued");

  expect(store.getState().phase).toMatchObject({ kind: "queued", requeued: false });
  expect(openings).toBe(before + 1);
});

test("a Player whose Opponent did not accept is back in the Queue, the Pairing gone", async () => {
  scripts.push({ messages: [queued, proposed(true)], closeWith: null });

  store.getState().enter();
  await until(({ phase }) => phase.kind === "proposed");
  serverSends({ type: "requeued", queuedAt: 1_000, serverAt: 9_000 });
  await until(({ phase }) => phase.kind === "queued");

  expect(store.getState().phase).toMatchObject({ kind: "queued", requeued: true });
});

test("a Player whose socket drops during a Pairing reconnects to it with their acceptance kept", async () => {
  scripts.push(
    { messages: [queued, proposed(false)], closeWith: null },
    { messages: [proposed(true)], closeWith: null },
  );

  store.getState().enter();
  await until(({ phase }) => phase.kind === "proposed");
  // A server restart: the socket is reopened.
  current?.close(1012);
  await until(({ phase }) => phase.kind === "reconnecting");
  // Nothing can be sent while the link is down: the Player has not accepted.
  store.getState().accept();
  expect(store.getState().phase).toMatchObject({
    kind: "reconnecting",
    held: { kind: "proposed", accepted: false },
  });

  await until(({ phase }) => phase.kind === "proposed");
  expect(store.getState().phase).toMatchObject({
    kind: "proposed",
    pairingId: "pairing-1",
    accepted: true,
  });
  expect(received).toEqual([]);
});

/** Starts a Practice Game and types into it, so that its clock runs. */
function playPracticeGame() {
  const at = performance.timeOrigin + performance.now();
  useGameStore.getState().setConfig({ mode: "time", seconds: 30 });
  useGameStore.getState().applyEvent({ type: "start", at });
  useGameStore.getState().applyEvent({ type: "insert", at: at + 200, text: "a" });
  expect(useGameStore.getState().game.status).toBe("running");
}

test("a proposed Pairing abandons the Practice Game being played", async () => {
  scripts.push({ messages: [queued], closeWith: null });
  store.getState().enter();
  await until(({ phase }) => phase.kind === "queued");
  playPracticeGame();
  const restartsBefore = useGameStore.getState().restartCount;

  serverSends(proposed(false));
  await until(({ phase }) => phase.kind === "proposed");

  const { game, restartCount } = useGameStore.getState();
  expect(game.status).toBe("ready");
  expect(game.startedAt).toBeNull();
  expect(restartCount).toBeGreaterThan(restartsBefore);
});

test("a Pairing proposed again after a reconnect leaves the Game alone", async () => {
  scripts.push(
    { messages: [queued, proposed(false)], closeWith: null },
    { messages: [proposed(false)], closeWith: null },
  );
  store.getState().enter();
  await until(({ phase }) => phase.kind === "proposed");
  current?.close(1012);
  await until(({ phase }) => phase.kind === "reconnecting");
  const restartsBefore = useGameStore.getState().restartCount;

  await until(({ phase }) => phase.kind === "proposed");

  expect(useGameStore.getState().restartCount).toBe(restartsBefore);
});

test("a requeue gives a fresh ready Game that takes the typing area again", async () => {
  scripts.push({ messages: [queued, proposed(true)], closeWith: null });
  store.getState().enter();
  await until(({ phase }) => phase.kind === "proposed");
  // Whatever happened to the Game under the prompt, the Player finds a fresh one.
  playPracticeGame();
  const restartsBefore = useGameStore.getState().restartCount;

  serverSends({ type: "requeued", queuedAt: 1_000, serverAt: 9_000 });
  await until(({ phase }) => phase.kind === "queued");

  const { game, restartCount } = useGameStore.getState();
  expect(game.status).toBe("ready");
  expect(game.startedAt).toBeNull();
  // A new key remounts the typing area, whose input takes the focus as it mounts.
  expect(restartCount).toBeGreaterThan(restartsBefore);
});

test("leaving the Queue closes the socket and goes back to idle", async () => {
  scripts.push({ messages: [queued], closeWith: null });

  store.getState().enter();
  await until(({ phase }) => phase.kind === "queued");
  store.getState().leave();

  expect(store.getState().phase).toEqual({ kind: "idle" });
});
