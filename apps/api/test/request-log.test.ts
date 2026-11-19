import { afterAll, beforeEach, expect, test } from "bun:test";
import { getLogger, type LogRecord, resetLogger, setupLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { createTestAuth, signInPlayer, signInPlayerWithNickname } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket, openSocketOf, requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const auth = createTestAuth(testDb.db);
const records: LogRecord[] = [];
await setupLogger({ sink: (record) => void records.push(record) });
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"));
// Listening on an ephemeral port: the in-process request seam cannot upgrade a connection.
const listening = createApp(testDb.db, auth, testRedis.redis, getLogger("api")).listen(0);
const origin = `http://localhost:${listening.server?.port}`;
beforeEach(() => {
  records.length = 0;
});
afterAll(async () => {
  await listening.stop(true);
  await resetLogger();
  await testRedis.drop();
  await testDb.drop();
});

// The request log is written once the response is sent, a moment after the client has it.
const httpRecords = async () => {
  await Bun.sleep(20);
  return records.filter(({ category }) => category.join(".") === "api.http");
};

const recordsOf = (category: string) =>
  records.filter((record) => record.category.join(".") === category);

// A socket's close reaches the server a moment after the client closed it.
const closeRecordOf = async (category: string) => {
  for (let tries = 0; tries < 100; tries += 1) {
    const closing = recordsOf(category).find(({ properties }) => properties.code !== undefined);
    if (closing) return closing;
    await Bun.sleep(10);
  }
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test("every response carries a fresh request id made by the server, whatever the client sent", async () => {
  const first = await app.handle(
    new Request("http://localhost/api/me", { headers: { "x-request-id": "forged" } }),
  );
  const second = await app.handle(new Request("http://localhost/health"));

  expect(first.headers.get("x-request-id")).toMatch(uuid);
  expect(second.headers.get("x-request-id")).toMatch(uuid);
  expect(first.headers.get("x-request-id")).not.toBe(second.headers.get("x-request-id"));
});

test("a request writes one record with its method, route pattern, status, duration, request id and the Guest", async () => {
  const response = await app.handle(
    new Request(`http://localhost/api/duels/${crypto.randomUUID()}`),
  );
  expect(response.status).toBe(404);

  const logged = await httpRecords();
  expect(logged).toHaveLength(1);
  const [record] = logged;
  expect(record?.level).toBe("info");
  expect(record?.properties).toEqual({
    method: "GET",
    route: "/api/duels/:id",
    status: 404,
    durationMs: expect.any(Number),
    requestId: response.headers.get("x-request-id"),
    guestId: expect.any(String),
  });
});

test("the request record names the Player when they are signed in", async () => {
  const { player, cookie } = await signInPlayer(auth);
  const response = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie } }),
  );
  expect(response.status).toBe(200);

  const [record] = await httpRecords();
  expect(record?.properties).toMatchObject({
    method: "GET",
    route: "/api/me",
    status: 200,
    playerId: player.id,
  });
});

test("the health and readiness probes write no request record", async () => {
  const health = await app.handle(new Request("http://localhost/health"));
  const ready = await app.handle(new Request("http://localhost/ready"));
  expect(health.status).toBe(200);
  expect(ready.status).toBe(200);

  expect(await httpRecords()).toEqual([]);
});

test("a route that throws answers a generic 500 with the request id, and logs the error with its stack", async () => {
  // Every Redis command fails, as when Redis is gone.
  const client = new Proxy(testRedis.redis.client, {
    get: (target, property) => {
      const value: unknown = Reflect.get(target, property);
      return typeof value === "function" ? () => Promise.reject(new Error("Redis is gone")) : value;
    },
  });
  const failing = createApp(testDb.db, auth, { ...testRedis.redis, client }, getLogger("api"));

  const response = await failing.handle(
    new Request(`http://localhost/api/duels/${crypto.randomUUID()}`),
  );

  expect(response.status).toBe(500);
  const requestId = response.headers.get("x-request-id");
  expect(requestId).toMatch(uuid);
  expect(await response.json()).toEqual({ code: "INTERNAL_ERROR", requestId });
  const logged = await httpRecords();
  const failure = logged.find(({ properties }) => properties.error !== undefined);
  expect(failure?.level).toBe("error");
  expect(failure?.properties).toMatchObject({
    route: "/api/duels/:id",
    requestId,
    error: expect.objectContaining({ stack: expect.stringContaining("Redis is gone") }),
  });
  const line = logged.find(({ properties }) => properties.error === undefined);
  expect(line?.level).toBe("error");
  expect(line?.properties).toMatchObject({ status: 500, requestId });
});

test("an expected rejection keeps its status and body", async () => {
  const { cookie } = await signInPlayer(auth);
  const response = await app.handle(
    new Request("http://localhost/api/me/nickname", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ nickname: "!" }),
    }),
  );

  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ code: "NICKNAME_INVALID" });
  const [record] = await httpRecords();
  expect(record?.level).toBe("info");
  expect(record?.properties).toMatchObject({ route: "/api/me/nickname", status: 422 });
});

test("no record holds the cookie or the authorization header of a request", async () => {
  const { cookie } = await signInPlayer(auth);
  const authorization = "Bearer secret-token-of-the-test";
  await app.handle(new Request("http://localhost/api/me", { headers: { cookie, authorization } }));
  await app.handle(
    new Request("http://localhost/api/auth/get-session", { headers: { cookie, authorization } }),
  );

  const logged = await httpRecords();
  expect(logged.length).toBeGreaterThan(0);
  const written = Bun.inspect(logged);
  expect(written).not.toContain(cookie.split("=")[1]);
  expect(written).not.toContain("secret-token-of-the-test");
});

test("a Duel socket logs its opening and its closing with the Duel, the seat and the Participant, and none of its messages", async () => {
  const created = await fetch(`${origin}/api/duels`, { method: "POST" });
  const { id } = (await created.json()) as { id: string };
  const cookie = created.headers.get("set-cookie")?.split(";")[0] ?? "";
  records.length = 0;

  const socket = await openSocket(
    `${origin.replace(/^http/, "ws")}/api/duels/${id}/socket`,
    cookie,
  );
  await socket.next();
  for (let ping = 0; ping < 5; ping += 1) {
    socket.send({ type: "ping", clientAt: Date.now() });
    await socket.next();
  }
  socket.close();
  const closing = await closeRecordOf("api.duel");

  const [opening] = recordsOf("api.duel");
  expect(opening?.properties).toEqual({ duelId: id, seat: 0, guestId: expect.any(String) });
  expect(closing?.properties).toEqual({
    duelId: id,
    seat: 0,
    guestId: opening?.properties.guestId,
    // What a server reads when the client closes without a code.
    code: 1005,
  });
  expect(recordsOf("api.duel")).toHaveLength(2);
  expect(recordsOf("api.http")).toEqual([]);
});

test("a refused socket upgrade writes its request record, with its status", async () => {
  const socketOrigin = origin.replace(/^http/, "ws");
  const unknownDuel = await requestUpgrade(
    `${socketOrigin}/api/duels/${crypto.randomUUID()}/socket`,
  );
  const signedOut = await requestUpgrade(`${socketOrigin}/api/queue/socket`);
  expect(unknownDuel.status).toBe(404);
  expect(signedOut.status).toBe(401);

  const logged = await httpRecords();
  expect(logged.map(({ properties }) => properties)).toEqual([
    expect.objectContaining({
      method: "GET",
      route: "/api/duels/:id/socket",
      status: 404,
      requestId: unknownDuel.headers.get("x-request-id"),
    }),
    expect.objectContaining({
      method: "GET",
      route: "/api/queue/socket",
      status: 401,
      requestId: signedOut.headers.get("x-request-id"),
    }),
  ]);
});

test("a Queue socket logs its opening and its closing with the Player", async () => {
  const { player, cookie } = await signInPlayerWithNickname(auth, origin);
  records.length = 0;

  const socket = await openSocketOf(`${origin.replace(/^http/, "ws")}/api/queue/socket`, cookie);
  await socket.next();
  socket.close();
  const closing = await closeRecordOf("api.queue");

  const [opening] = recordsOf("api.queue");
  expect(opening?.properties).toEqual({ playerId: player.id });
  expect(closing?.properties).toEqual({ playerId: player.id, code: 1005 });
});

test("a failing Duel socket handler is logged with the Duel and the Participant", async () => {
  // Redis fails once the socket is open, as when it goes away during a Duel.
  let gone = false;
  const client = new Proxy(testRedis.redis.client, {
    get: (target, property) => {
      const value: unknown = Reflect.get(target, property);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) =>
        gone ? Promise.reject(new Error("Redis is gone")) : Reflect.apply(value, target, args);
    },
  });
  const failing = createApp(
    testDb.db,
    auth,
    { ...testRedis.redis, client },
    getLogger("api"),
  ).listen(0);
  const from = `http://localhost:${failing.server?.port}`;
  try {
    const created = await fetch(`${from}/api/duels`, { method: "POST" });
    const { id } = (await created.json()) as { id: string };
    const cookie = created.headers.get("set-cookie")?.split(";")[0] ?? "";
    const socket = await openSocket(
      `${from.replace(/^http/, "ws")}/api/duels/${id}/socket`,
      cookie,
    );
    await socket.next();
    records.length = 0;

    gone = true;
    socket.close();
    let failure: LogRecord | undefined;
    for (let tries = 0; tries < 100 && !failure; tries += 1) {
      failure = recordsOf("api.duel").find(({ level }) => level === "error");
      await Bun.sleep(10);
    }

    expect(failure?.properties).toMatchObject({
      duelId: id,
      guestId: expect.any(String),
      error: new Error("Redis is gone"),
    });
  } finally {
    await failing.stop(true);
  }
});
