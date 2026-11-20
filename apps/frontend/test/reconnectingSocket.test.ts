import { afterAll, expect, test } from "bun:test";
import { createReconnectingSocket } from "../src/shared/lib/reconnectingSocket.ts";

// What the server does with each connection it accepts, in order: greet it and close it with a
// code, close it at once without a word, or greet it and keep it open.
type Script = {
  readonly greet: string | null;
  readonly closeWith: number | null;
  readonly reason?: string;
};
const scripts: Script[] = [];
let connections = 0;

const server = Bun.serve({
  port: 0,
  fetch: (request, current) =>
    current.upgrade(request, { data: undefined }) ? undefined : new Response(null, { status: 400 }),
  websocket: {
    open(ws) {
      connections += 1;
      const { greet, closeWith, reason } = scripts.shift() ?? { greet: "hello", closeWith: null };
      if (greet !== null) ws.send(greet);
      if (closeWith !== null) ws.close(closeWith, reason);
    },
    message() {},
  },
});
const url = `ws://localhost:${server.port}`;
afterAll(() => server.stop(true));

const handlersOf = ({ reconnects }: { reconnects: boolean }) => {
  const seen: string[] = [];
  let settle: () => void = () => undefined;
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });
  return {
    seen,
    settled,
    handlers: {
      receive: (data: string) => seen.push(`receive ${data}`),
      findRefusal: () => Promise.resolve("refused for a reason"),
      refuse: (refusal: string) => {
        seen.push(`refuse ${refusal}`);
        settle();
      },
      reconnect: () => {
        seen.push("reconnect");
        return reconnects;
      },
      disconnect: (reason: string) => {
        seen.push(reason === "" ? "disconnect" : `disconnect ${reason}`);
        settle();
      },
    },
  };
};

test("a socket closed before its first message is refused, with the reason found, and not reopened", async () => {
  connections = 0;
  scripts.push({ greet: null, closeWith: 1008 });
  const socket = createReconnectingSocket();
  const { seen, settled, handlers } = handlersOf({ reconnects: true });

  socket.open(url, handlers);
  await settled;

  expect(seen).toEqual(["refuse refused for a reason"]);
  expect(connections).toBe(1);
});

test("a socket the server restarts is reopened once the owner agrees, and the new one is read", async () => {
  connections = 0;
  scripts.push({ greet: "first", closeWith: 1012 }, { greet: "second", closeWith: 1000 });
  const socket = createReconnectingSocket();
  const { seen, settled, handlers } = handlersOf({ reconnects: true });

  socket.open(url, handlers);
  await settled;

  expect(seen).toEqual(["receive first", "reconnect", "receive second", "disconnect"]);
  expect(connections).toBe(2);
});

test("a socket the server closed on purpose is not reopened", async () => {
  connections = 0;
  scripts.push({ greet: "only", closeWith: 1000 });
  const socket = createReconnectingSocket();
  const { seen, settled, handlers } = handlersOf({ reconnects: true });

  socket.open(url, handlers);
  await settled;

  expect(seen).toEqual(["receive only", "disconnect"]);
});

test("an owner told the socket is closed on purpose is given the reason the server closed it with", async () => {
  scripts.push({ greet: "only", closeWith: 1008, reason: "input not accepted" });
  const socket = createReconnectingSocket();
  const { seen, settled, handlers } = handlersOf({ reconnects: true });

  socket.open(url, handlers);
  await settled;

  expect(seen).toEqual(["receive only", "disconnect input not accepted"]);
});

test("an owner that no longer needs the socket is told it is disconnected instead", async () => {
  connections = 0;
  scripts.push({ greet: "first", closeWith: 1012 });
  const socket = createReconnectingSocket();
  const { seen, settled, handlers } = handlersOf({ reconnects: false });

  socket.open(url, handlers);
  await settled;

  expect(seen).toEqual(["receive first", "reconnect", "disconnect"]);
  expect(connections).toBe(1);
});

test("closing the socket while a reopening is pending cancels it", async () => {
  connections = 0;
  scripts.push({ greet: "first", closeWith: 1012 });
  const socket = createReconnectingSocket();
  const { seen, handlers } = handlersOf({ reconnects: true });

  socket.open(url, handlers);
  while (!seen.includes("reconnect")) await Bun.sleep(5);
  socket.close();
  // Past the first delay before a reopening.
  await Bun.sleep(700);

  expect(connections).toBe(1);
});
