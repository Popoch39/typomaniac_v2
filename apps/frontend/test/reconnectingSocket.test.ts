import { afterAll, expect, test } from "bun:test";
import { createReconnectingSocket } from "../src/shared/lib/reconnectingSocket.ts";
import type { SocketLink } from "../src/shared/link/socketLink.ts";

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

// Reopens at once, for as many tries as the server refuses.
const immediately = () => 0;

const describeLink = (link: SocketLink) => {
  switch (link.kind) {
    case "opening":
    case "backoff":
      return `${link.kind} ${link.attempt}`;
    case "refused":
      return `refused ${link.refusal}`;
    case "down":
      return link.reason === "" ? "down" : `down ${link.reason}`;
    default:
      return link.kind;
  }
};

// Records what the owner reads, and settles once `isSettled` holds for what it read.
const ownerOf = (isSettled: (seen: readonly string[]) => boolean) => {
  const seen: string[] = [];
  let settle: () => void = () => undefined;
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const record = (line: string) => {
    seen.push(line);
    if (isSettled(seen)) settle();
  };
  return {
    seen,
    settled,
    handlers: {
      receive: (data: string) => record(`receive ${data}`),
      findRefusal: () => Promise.resolve("refused for a reason"),
      link: (link: SocketLink) => record(describeLink(link)),
    },
  };
};
const isOver = (seen: readonly string[]) =>
  seen.some((line) => line.startsWith("refused") || line.startsWith("down"));

test("a socket closed before its first message is refused, with the reason found, and not reopened", async () => {
  connections = 0;
  scripts.push({ greet: null, closeWith: 1008 });
  const socket = createReconnectingSocket();
  const { seen, settled, handlers } = ownerOf(isOver);

  socket.open(url, handlers);
  await settled;

  expect(seen).toEqual(["opening 0", "refusing", "refused refused for a reason"]);
  expect(connections).toBe(1);
});

test("a socket the server restarts backs off, opens again and is read, until it goes down", async () => {
  connections = 0;
  scripts.push({ greet: "first", closeWith: 1012 }, { greet: "second", closeWith: 1000 });
  const socket = createReconnectingSocket();
  const { seen, settled, handlers } = ownerOf(isOver);

  socket.open(url, handlers);
  await settled;

  expect(seen).toEqual([
    "opening 0",
    "open",
    "receive first",
    "backoff 1",
    "opening 1",
    "open",
    "receive second",
    "down",
  ]);
  expect(connections).toBe(2);
});

test("a reopening refused by the server backs off again, then opens once the server is back", async () => {
  connections = 0;
  scripts.push(
    { greet: "first", closeWith: 1012 },
    { greet: null, closeWith: 1012 },
    { greet: "back", closeWith: null },
  );
  const socket = createReconnectingSocket(immediately);
  const { seen, settled, handlers } = ownerOf((lines) => lines.includes("receive back"));

  socket.open(url, handlers);
  await settled;
  socket.close();

  expect(seen).toEqual([
    "opening 0",
    "open",
    "receive first",
    "backoff 1",
    "opening 1",
    "backoff 2",
    "opening 2",
    "open",
    "receive back",
  ]);
});

test("a socket the server closed on purpose goes down with the reason the server gave", async () => {
  scripts.push({ greet: "only", closeWith: 1008, reason: "input not accepted" });
  const socket = createReconnectingSocket();
  const { seen, settled, handlers } = ownerOf(isOver);

  socket.open(url, handlers);
  await settled;

  expect(seen).toEqual(["opening 0", "open", "receive only", "down input not accepted"]);
});

test("an owner that closes the socket as it backs off has it not reopened", async () => {
  connections = 0;
  scripts.push({ greet: "first", closeWith: 1012 });
  const socket = createReconnectingSocket(immediately);
  const { seen, handlers } = ownerOf(() => false);

  socket.open(url, {
    ...handlers,
    link: (link) => {
      handlers.link(link);
      if (link.kind === "backoff") socket.close();
    },
  });
  while (!seen.includes("backoff 1")) await Bun.sleep(5);
  await Bun.sleep(100);

  expect(seen).toEqual(["opening 0", "open", "receive first", "backoff 1"]);
  expect(connections).toBe(1);
});

test("closing the socket while a reopening is pending cancels it", async () => {
  connections = 0;
  scripts.push({ greet: "first", closeWith: 1012 });
  const socket = createReconnectingSocket();
  const { seen, handlers } = ownerOf(() => false);

  socket.open(url, handlers);
  while (!seen.includes("backoff 1")) await Bun.sleep(5);
  socket.close();
  // Past the first delay before a reopening.
  await Bun.sleep(700);

  expect(connections).toBe(1);
});

test("a message is sent only while the link is open, and the caller is told when it was not", async () => {
  scripts.push({ greet: "hello", closeWith: null });
  const socket = createReconnectingSocket();
  const { seen, handlers } = ownerOf(() => false);

  expect(socket.send("before opening")).toBe(false);
  socket.open(url, handlers);
  expect(socket.send("while opening")).toBe(false);
  while (!seen.includes("open")) await Bun.sleep(5);
  expect(socket.send("while open")).toBe(true);
  socket.close();
  expect(socket.send("after closing")).toBe(false);
});
