import { afterAll, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG, type ClientMessage, type ServerMessage } from "@repo/duel-engine";
import { applyEvent, createGame, type GameEvent } from "@repo/typing-engine";

const words = ["alpha ", "bravo ", "charlie ", "delta ", "echo "];
const participants = [0, 1].map((seat) => ({
  seat: seat === 0 ? (0 as const) : (1 as const),
  name: `Player ${seat}`,
  avatarUrl: null,
  ornament: null,
  connected: true,
}));

// The server's journal of seat 0, as the Events forwarded to it arrive, and the Start it announced.
const journal: GameEvent[] = [];
let startAt = 0;
let connections = 0;
let dropSeated: () => void = () => undefined;
const serverTime = () => performance.timeOrigin + performance.now();

const stateOf = (ownJournal: readonly GameEvent[]): ServerMessage => ({
  type: "state",
  seat: 0,
  round: 1,
  rounds: [],
  startAt,
  words,
  participants,
  ranks: null,
  journals: [ownJournal, []],
});

// The first connection seats the Participant and announces a Start just ahead; each later one is a
// return mid-Game, handed the journal the server counted.
const server = Bun.serve({
  port: 0,
  fetch: (request, current) =>
    current.upgrade(request, { data: undefined }) ? undefined : new Response(null, { status: 400 }),
  websocket: {
    open(ws) {
      connections += 1;
      // A server restart: the client tries the socket again.
      dropSeated = () => ws.close(1012);
      if (connections === 1) {
        startAt = serverTime() + 200;
        ws.send(JSON.stringify({ ...stateOf([]), startAt: null, words: null }));
      } else {
        ws.send(JSON.stringify(stateOf(journal)));
      }
      ws.send(JSON.stringify({ type: "countdown", round: 1, startAt, words }));
    },
    message(ws, data) {
      const message = JSON.parse(String(data)) as ClientMessage;
      if (message.type === "ping")
        ws.send(
          JSON.stringify({ type: "pong", clientAt: message.clientAt, serverAt: serverTime() }),
        );
      if (message.type === "event") journal.push(message.event);
    },
  },
});
afterAll(() => server.stop(true));

// The Duel socket is opened on the page's own origin.
Object.assign(globalThis, {
  window: { location: { protocol: "http:", host: `localhost:${server.port}`, origin: "" } },
});
const { useDuelStore } = await import("../src/features/duel/store/useDuelStore.ts");
const { useGameStore } = await import("../src/features/game/store/useGameStore.ts");

async function until(isMet: () => boolean) {
  while (!isMet()) await Bun.sleep(5);
}

test("Keystrokes applied while the link is reconnecting do not change the Game, which resumes as the server journal", async () => {
  useDuelStore.getState().join("duel-1");
  await until(() => useGameStore.getState().game.status === "running");
  useGameStore.getState().applyEvent({ type: "insert", at: serverTime(), text: "a" });
  await until(() => journal.some((event) => event.type === "insert"));

  dropSeated();
  await until(() => useDuelStore.getState().isReconnecting);
  const frozen = useGameStore.getState().game;
  useGameStore.getState().applyEvent({ type: "insert", at: serverTime(), text: "l" });

  expect(useGameStore.getState().game).toBe(frozen);

  await until(
    () => !useDuelStore.getState().isReconnecting && useGameStore.getState().game !== frozen,
  );
  const resumed = journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words));
  expect(useGameStore.getState().game.inputs).toEqual(resumed.inputs);
  expect(useGameStore.getState().game.startedAt).toBe(resumed.startedAt);

  useDuelStore.getState().leave();
});
