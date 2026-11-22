import { afterAll, expect, test } from "bun:test";
import type { Seat, ServerMessage } from "@repo/duel-engine";
import { createRelay } from "../src/modules/duel/relay.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testRedis = await createTestRedis();
afterAll(() => testRedis.drop());

const listen = (seat: Seat) => {
  const received: ServerMessage[] = [];
  const delivery = {
    seat,
    connection: crypto.randomUUID(),
    send: (message: ServerMessage) => void received.push(message),
    evict: () => {},
  };
  return { delivery, received };
};

const pong = (clientAt: number): ServerMessage => ({ type: "pong", clientAt, serverAt: clientAt });

const heardLast = ({ received }: ReturnType<typeof listen>) =>
  received.some((message) => message.type === "pong" && message.clientAt === 2);

test("two sockets joining a Duel's relay at once on one instance both receive what is published as soon as their own join resolves", async () => {
  const relay = createRelay(testRedis.redis);
  // The window is a few milliseconds wide: a single Duel would let the race pass unseen.
  for (let attempt = 0; attempt < 300; attempt++) {
    const duelId = crypto.randomUUID();
    const [first, second] = [listen(0), listen(1)];

    const firstJoin = relay.join(duelId, first.delivery);
    await relay.join(duelId, second.delivery);
    await relay.publish(duelId, null, pong(1));
    await firstJoin;
    // Published on the same channel after the first, so its arrival means the first was delivered or lost.
    await relay.publish(duelId, null, pong(2));
    while (!heardLast(first) || !heardLast(second)) await Bun.sleep(1);

    expect(first.received).toEqual([pong(1), pong(2)]);
    expect(second.received).toEqual([pong(1), pong(2)]);
    await relay.leave(duelId, first.delivery);
    await relay.leave(duelId, second.delivery);
  }
});
