import type { ClientMessage, ServerMessage } from "@repo/duel-engine";

// A real WebSocket client that queues what the server sends, so a test awaits each message in order.
export const openSocketOf = async <Received, Sent>(url: string, cookie: string) => {
  const socket = new WebSocket(url, { headers: { cookie } });
  const received: Received[] = [];
  const waiting: ((message: Received) => void)[] = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as Received;
    const resolve = waiting.shift();
    if (resolve) resolve(message);
    else received.push(message);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  // Settles once the socket is closed, from either side, with its close code: how a test sees the
  // server close it.
  const closed = new Promise<number>((resolve) =>
    socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
  );

  const next = () => {
    const message = received.shift();
    if (message) return Promise.resolve(message);
    return new Promise<Received>((resolve) => waiting.push(resolve));
  };
  const send = (message: Sent) => socket.send(JSON.stringify(message));
  // Whether nothing arrives for that long: how a test sees that the server dropped a message.
  const staysSilent = async (ms: number) => {
    await Bun.sleep(ms);
    return received.length === 0;
  };
  return {
    next,
    send,
    staysSilent,
    closed,
    close: () => socket.close(),
    // Cuts the connection without a close frame, as a lost network does: the server sees 1006.
    drop: () => socket.terminate(),
  };
};

/** The socket of a Duel. */
export const openSocket = (url: string, cookie: string) =>
  openSocketOf<ServerMessage, ClientMessage>(url, cookie);

// Asks for the upgrade over plain HTTP, so that a refused upgrade shows its status and body.
export const requestUpgrade = (url: string, cookie?: string) =>
  fetch(url.replace(/^ws/, "http"), {
    headers: {
      connection: "Upgrade",
      upgrade: "websocket",
      "sec-websocket-version": "13",
      "sec-websocket-key": btoa(crypto.randomUUID().slice(0, 16)),
      ...(cookie ? { cookie } : {}),
    },
  });
