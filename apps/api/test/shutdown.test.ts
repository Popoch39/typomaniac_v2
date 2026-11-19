import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { createLifecycle } from "../src/modules/lifecycle/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket } from "./helpers/socket.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const auth = createTestAuth(testDb.db);
afterAll(async () => {
  await testRedis.drop();
  await testDb.drop();
});

const startInstance = (lifecycle = createLifecycle()) => {
  const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    duel: { countdownMs: 0 },
    lifecycle,
  }).listen(0);
  return { app, origin: `http://localhost:${app.server?.port}` };
};

const signInPlayerWithNickname = async (origin: string) => {
  const { cookie } = await signInPlayer(auth);
  const response = await fetch(`${origin}/api/me/nickname`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ nickname: `p_${crypto.randomUUID().slice(0, 8)}` }),
  });
  expect(response.status).toBe(200);
  return cookie;
};

const duelSocketUrl = (origin: string, duelId: string) =>
  `${origin.replace(/^http/, "ws")}/api/duels/${duelId}/socket`;

test("a Duel interrupted by an instance stopping is rejoined on another instance with its Round and Games intact", async () => {
  const lifecycle = createLifecycle();
  const stopping = startInstance(lifecycle);
  const next = startInstance();
  try {
    const creatorCookie = await signInPlayerWithNickname(stopping.origin);
    const opponentCookie = await signInPlayerWithNickname(stopping.origin);
    const created = await fetch(`${stopping.origin}/api/duels`, {
      method: "POST",
      headers: { cookie: creatorCookie },
    });
    const { id } = (await created.json()) as { id: string };
    const creator = await openSocket(duelSocketUrl(stopping.origin, id), creatorCookie);
    await creator.next();
    const opponent = await openSocket(duelSocketUrl(stopping.origin, id), opponentCookie);
    // State and Countdown for the opponent; presence and Countdown for the creator.
    for (const socket of [opponent, opponent, creator, creator]) await socket.next();
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    opponent.send({ type: "event", round: 1, event: { type: "start", at: 11 } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "a" } });
    opponent.send({ type: "event", round: 1, event: { type: "insert", at: 21, text: "b" } });
    for (const socket of [opponent, opponent, creator, creator]) await socket.next();

    lifecycle.beginStopping();
    await lifecycle.closeSockets();
    await stopping.app.stop();
    const closeCodes = [await creator.closed, await opponent.closed];
    const creatorAgain = await openSocket(duelSocketUrl(next.origin, id), creatorCookie);
    const state = await creatorAgain.next();
    creatorAgain.close();

    expect(closeCodes).toEqual([1012, 1012]);
    expect(state).toMatchObject({
      type: "state",
      seat: 0,
      round: 1,
      journals: [
        [
          { type: "start", at: 10 },
          { type: "insert", at: 20, text: "a" },
        ],
        [
          { type: "start", at: 11 },
          { type: "insert", at: 21, text: "b" },
        ],
      ],
    });
  } finally {
    await stopping.app.stop(true);
    await next.app.stop(true);
  }
});

test("a socket opening on an instance that is stopping is closed at once with 1012", async () => {
  const lifecycle = createLifecycle();
  const { app, origin } = startInstance(lifecycle);
  try {
    const cookie = await signInPlayerWithNickname(origin);
    const created = await fetch(`${origin}/api/duels`, { method: "POST", headers: { cookie } });
    const { id } = (await created.json()) as { id: string };
    lifecycle.beginStopping();

    const socket = await openSocket(duelSocketUrl(origin, id), cookie);

    expect(await socket.closed).toBe(1012);
  } finally {
    await app.stop(true);
  }
});
