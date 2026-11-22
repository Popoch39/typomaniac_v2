import { afterAll, afterEach, expect, test } from "bun:test";
import { useOnlineStore } from "../src/features/online/store/useOnlineStore.ts";

const store = useOnlineStore;

// While `refusing`, the server answers every opening with an error, as one that is down would.
let refusing = false;
let count = 3;
let openings = 0;
const sockets = new Set<Bun.ServerWebSocket<undefined>>();

const server = Bun.serve({
  port: 0,
  fetch: (request, current) => {
    openings += 1;
    if (refusing) return new Response(null, { status: 503 });
    return current.upgrade(request, { data: undefined })
      ? undefined
      : new Response(null, { status: 400 });
  },
  websocket: {
    open(ws) {
      sockets.add(ws);
      ws.send(JSON.stringify({ type: "onlineCount", count }));
    },
    close(ws) {
      sockets.delete(ws);
    },
    message() {},
  },
});
const url = `ws://localhost:${server.port}`;
afterAll(() => server.stop(true));
afterEach(() => {
  store.getState().follow(null, url);
  refusing = false;
});

async function until(condition: () => boolean) {
  while (!condition()) await Bun.sleep(5);
}

// Takes the server down: every open socket is closed as by a restart, and every opening is refused.
async function goDown() {
  refusing = true;
  for (const ws of sockets) ws.close(1012);
  await until(() => store.getState().isDown);
}

// One more refused opening, retried at once as the browser coming back online would.
async function refuseOnceMore() {
  const before = openings;
  // Lets the socket see the last refusal and wait for its next try, which the retry brings forward.
  await Bun.sleep(50);
  store.getState().retry();
  await until(() => openings > before);
}

test("the Online count comes back by itself after an outage longer than the reconnect budget", async () => {
  count = 3;
  store.getState().follow("player-1", url);
  await until(() => store.getState().count === 3);

  await goDown();
  // Past the five tries a socket used to be given before it closed for good.
  for (let i = 0; i < 6; i += 1) await refuseOnceMore();
  expect(store.getState().isDown).toBe(true);

  refusing = false;
  count = 5;
  await Bun.sleep(50);
  store.getState().retry();
  await until(() => store.getState().count === 5);

  expect(store.getState().isDown).toBe(false);
});

test("signing out while the server is down stops the retries", async () => {
  store.getState().follow("player-1", url);
  await until(() => store.getState().count !== null);
  await goDown();

  store.getState().follow(null, url);
  const after = openings;
  // Past the next try the socket would have made.
  await Bun.sleep(1200);

  expect(openings).toBe(after);
  expect(store.getState().isDown).toBe(false);
  expect(store.getState().count).toBeNull();
});

test("signing in, switching Player and signing out move the Online store through its variants", async () => {
  count = 4;
  expect(store.getState().presence).toEqual({ kind: "guest" });

  store.getState().follow("player-1", url);
  expect(store.getState().presence).toEqual({ kind: "connecting", playerId: "player-1" });
  await until(() => store.getState().presence.kind === "live");
  expect(store.getState().presence).toEqual({ kind: "live", playerId: "player-1", count: 4 });

  store.getState().follow("player-2", url);
  expect(store.getState().presence).toEqual({ kind: "connecting", playerId: "player-2" });
  await until(() => store.getState().presence.kind === "live");
  expect(store.getState().presence).toEqual({ kind: "live", playerId: "player-2", count: 4 });

  store.getState().follow(null, url);
  expect(store.getState().presence).toEqual({ kind: "guest" });
});

test("an outage moves the Online store down with the last count, and a reopening back live", async () => {
  count = 3;
  store.getState().follow("player-1", url);
  await until(() => store.getState().presence.kind === "live");

  await goDown();
  expect(store.getState().presence).toEqual({ kind: "down", playerId: "player-1", lastCount: 3 });

  refusing = false;
  count = 6;
  await Bun.sleep(50);
  store.getState().retry();
  await until(() => store.getState().presence.kind === "live");
  expect(store.getState().presence).toEqual({ kind: "live", playerId: "player-1", count: 6 });
});
