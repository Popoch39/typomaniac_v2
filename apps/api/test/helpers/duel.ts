import { expect } from "bun:test";
import type { ClientMessage, ServerMessage } from "@repo/duel-engine";
import { type Account, call, type Instance } from "./instance.ts";
import { openSocket } from "./socket.ts";

// Duels of these tests start at once and follow one another without a pause.
export const quickDuels = { countdownMs: 0, roundPauseMs: 0 };

export const createCustomDuel = async (instance: Instance, creator: Account) => {
  const response = await call(instance, "POST", "/api/duels", creator.cookie);
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
};

export type DuelSocket = Awaited<ReturnType<typeof openSocket>>;

export const nextOfType = async <Type extends ServerMessage["type"]>(
  socket: DuelSocket,
  type: Type,
) => {
  for (;;) {
    const message = await socket.next();
    if (message.type === type) return message as Extract<ServerMessage, { type: Type }>;
  }
};

export const takeSeat = async (instance: Instance, duelId: string, { cookie }: Account) => {
  const socket = await openSocket(
    `${instance.origin.replace(/^http/, "ws")}/api/duels/${duelId}/socket`,
    cookie,
  );
  await nextOfType(socket, "state");
  return socket;
};

// Each character is a key going down, its insert and the key going up, as the game's client sends it.
export const typeWord = (
  socket: { send: (message: ClientMessage) => void },
  round: number,
  word: string,
) => {
  for (const [offset, char] of `${word} `.split("").entries()) {
    const code = char === " " ? "Space" : `Key${char.toUpperCase()}`;
    const at = 1010 + offset * 100;
    socket.send({ type: "event", round, event: { type: "keyDown", at, code } });
    socket.send({ type: "event", round, event: { type: "insert", at: at + 10, text: char } });
    socket.send({ type: "event", round, event: { type: "keyUp", at: at + 60, code } });
  }
};

// Plays the Duel to its end: the first socket types the first Target word of each Round, the other
// nothing, and every Game ends on a Tick stamped 30 seconds ahead.
export const playToEnd = async (winner: DuelSocket, loser: DuelSocket) => {
  for (let round = 1; round <= 2; round++) {
    const countdown = await nextOfType(winner, "countdown");
    await nextOfType(loser, "countdown");
    await Bun.sleep(Math.max(0, countdown.startAt - Date.now()));
    for (const socket of [winner, loser]) {
      socket.send({ type: "event", round, event: { type: "start", at: 10 } });
      if (socket === winner) typeWord(socket, round, countdown.words[0] ?? "");
      socket.send({ type: "event", round, event: { type: "tick", at: 30_010 } });
    }
    await Promise.all([nextOfType(winner, "roundEnd"), nextOfType(loser, "roundEnd")]);
  }
  await Promise.all([nextOfType(winner, "end"), nextOfType(loser, "end")]);
};
