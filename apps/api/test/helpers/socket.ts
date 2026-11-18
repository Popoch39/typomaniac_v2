import type { ServerMessage } from "@repo/duel-engine";

// A real WebSocket client that queues what the server sends, so a test awaits each message in order.
export const openSocket = async (url: string, cookie: string) => {
  const socket = new WebSocket(url, { headers: { cookie } });
  const received: ServerMessage[] = [];
  const waiting: ((message: ServerMessage) => void)[] = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ServerMessage;
    const resolve = waiting.shift();
    if (resolve) resolve(message);
    else received.push(message);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const next = () => {
    const message = received.shift();
    if (message) return Promise.resolve(message);
    return new Promise<ServerMessage>((resolve) => waiting.push(resolve));
  };
  return { next, close: () => socket.close() };
};

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
