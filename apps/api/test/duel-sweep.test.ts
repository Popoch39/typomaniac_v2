import { afterAll, expect, test } from "bun:test";
import { DUEL_WORD_COUNT, type ServerMessage, START_WINDOW_MS } from "@repo/duel-engine";
import type { GameEvent } from "@repo/typing-engine";
import { eq } from "drizzle-orm";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import type { Db } from "../src/db/client.ts";
import { duel, duelGame, duelParticipant, duelRound } from "../src/db/schema.ts";
import type { DuelOptions } from "../src/modules/duel/index.ts";
import { createRelay } from "../src/modules/duel/relay.ts";
import { DUEL_EXPIRY_MS, sweepDuels } from "../src/modules/duel/service.ts";
import { createTestAuth, signInPlayerWithNickname } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket } from "./helpers/socket.ts";

const testDb = await createTestDb();
const auth = createTestAuth(testDb.db);
afterAll(() => testDb.drop());

type Socket = Awaited<ReturnType<typeof openSocket>>;
type App = ReturnType<typeof createApp>;

// Each test gets its own Redis namespace: the instances that sweep it are the ones it starts.
const createInstances = async (count: number, options: DuelOptions, db: Db = testDb.db) => {
  const testRedis = await createTestRedis();
  const apps = Array.from({ length: count }, () =>
    createApp(db, auth, testRedis.redis, getLogger("api"), options).listen(0),
  );
  return {
    apps,
    redis: testRedis.redis,
    stop: async () => {
      for (const app of apps) await app.stop(true);
      await testRedis.drop();
    },
  };
};

const originOf = (app: App) => `http://localhost:${app.server?.port}`;

const signInCookie = async (app: App) =>
  (await signInPlayerWithNickname(auth, originOf(app))).cookie;

const openDuelSocket = (app: App, duelId: string, cookie: string) =>
  openSocket(`${originOf(app).replace(/^http/, "ws")}/api/duels/${duelId}/socket`, cookie);

const nextOfType = async <Type extends ServerMessage["type"]>(socket: Socket, type: Type) => {
  for (;;) {
    const message = await socket.next();
    if (message.type === type) return message as Extract<ServerMessage, { type: Type }>;
  }
};

// A Duel created on `app` with both Participants connected to it, up to the Countdown of its first Round.
const startDuel = async (app: App) => {
  const cookies = [await signInCookie(app), await signInCookie(app)] as const;
  const created = await fetch(`${originOf(app)}/api/duels`, {
    method: "POST",
    headers: { cookie: cookies[0] },
  });
  const { id } = (await created.json()) as { id: string };
  const creator = await openDuelSocket(app, id, cookies[0]);
  // Seated before the Opponent arrives, so that the Countdown reaches each of them once.
  await nextOfType(creator, "state");
  const opponent = await openDuelSocket(app, id, cookies[1]);
  const countdown = await nextOfType(creator, "countdown");
  await nextOfType(opponent, "countdown");
  return { duelId: id, cookies, sockets: [creator, opponent] as const, countdown };
};

// A whole Game in three Events at most, ended by a Tick stamped 30 seconds ahead.
const playGame = (socket: Socket, round: number, typed?: string) => {
  socket.send({ type: "event", round, event: { type: "start", at: 10 } });
  if (typed !== undefined)
    socket.send({ type: "event", round, event: { type: "insert", at: 1010, text: typed } });
  socket.send({ type: "event", round, event: { type: "tick", at: 30_010 } });
};

// The delays of the instances a test stands in for when it sweeps at instants of its own.
const delays = { expiryMs: DUEL_EXPIRY_MS, countdownMs: 3000, roundPauseMs: 5000 };

test("a Duel is advanced by an API instance that holds none of its sockets: the Countdown of the next Round is announced with nobody connected", async () => {
  const { apps, stop } = await createInstances(2, { countdownMs: 0, roundPauseMs: 300 });
  const [first, second] = apps as [App, App];
  try {
    const { duelId, cookies, sockets, countdown } = await startDuel(first);
    for (const socket of sockets) playGame(socket, 1, `${countdown.words[0]} `);
    const { nextStartAt } = await nextOfType(sockets[0], "roundEnd");
    if (nextStartAt === null) throw new Error("Expected a second Round");
    // Both Participants leave with the only instance that held their sockets.
    await first.stop(true);
    await Bun.sleep(nextStartAt + START_WINDOW_MS + 100 - Date.now());

    const again = await openDuelSocket(second, duelId, cookies[0]);
    const state = await again.next();
    again.close();

    // The Target words of a Round are only handed out once its Countdown was announced.
    expect(state).toMatchObject({ type: "state", round: 2, startAt: nextStartAt });
    if (state.type !== "state") throw new Error("Expected the state");
    expect(state.words).toHaveLength(DUEL_WORD_COUNT);
  } finally {
    await stop();
  }
});

test("a Duel whose two Participants left after its first Start is played to its end and saved, each remaining Game started at its Start and closed at its deadline", async () => {
  const { apps, redis, stop } = await createInstances(1, { countdownMs: 0 });
  const [app] = apps as [App];
  try {
    const { duelId, sockets, countdown } = await startDuel(app);
    const [firstWord = ""] = countdown.words;
    sockets[0].send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    sockets[0].send({
      type: "event",
      round: 1,
      event: { type: "insert", at: 1010, text: `${firstWord} ` },
    });
    await nextOfType(sockets[1], "opponentEvent");
    await nextOfType(sockets[1], "opponentEvent");
    await app.stop(true);

    // The sweeps an instance would run, at the instants each step of the Duel falls due.
    const relay = createRelay(redis);
    const sweep = (now: number) =>
      sweepDuels(testDb.db, redis, relay, delays, now, getLogger("api.duel"));
    const starts = [countdown.startAt, countdown.startAt + 40_000, countdown.startAt + 80_000];
    const [first = 0, second = 0, third = 0] = starts;
    // Not yet 2 seconds past the deadline: nothing is closed.
    await sweep(first + 31_999);
    expect(await testDb.db.select().from(duel).where(eq(duel.id, duelId))).toEqual([]);
    // Each Round ends 32 seconds after its Start; the next one starts 5 + 3 seconds later, its
    // Countdown announced 3 seconds ahead.
    await sweep(first + 32_000);
    await sweep(second - 3000);
    await sweep(second + 32_000);
    await sweep(third - 3000);
    await sweep(third + 32_000);

    const rounds = await testDb.db
      .select()
      .from(duelRound)
      .where(eq(duelRound.duelId, duelId))
      .orderBy(duelRound.round);
    expect(
      rounds.map(({ startedAt, endedAt }) => [startedAt.getTime(), endedAt.getTime()]),
    ).toEqual(starts.map((startAt) => [startAt, startAt + 32_000]));
    const games = await testDb.db
      .select()
      .from(duelGame)
      .where(eq(duelGame.duelId, duelId))
      .orderBy(duelGame.round, duelGame.seat);
    const journals: GameEvent[][] = [
      [
        { type: "start", at: 10 },
        { type: "insert", at: 1010, text: `${firstWord} ` },
        { type: "tick", at: 30_010 },
      ],
      ...[first, second, second, third, third].map((startAt): GameEvent[] => [
        { type: "start", at: startAt },
        { type: "tick", at: startAt + 30_000 },
      ]),
    ];
    expect(games.map(({ journal }) => journal)).toEqual(journals);
    expect(games.map(({ outcome }) => outcome)).toEqual([
      "win",
      "loss",
      "draw",
      "draw",
      "draw",
      "draw",
    ]);
    const participants = await testDb.db
      .select()
      .from(duelParticipant)
      .where(eq(duelParticipant.duelId, duelId))
      .orderBy(duelParticipant.seat);
    expect(participants.map(({ outcome }) => outcome)).toEqual(["win", "loss"]);
  } finally {
    await stop();
  }
});

test("with two instances sweeping the same Redis at the same instants, each Round ends once and the Duel is saved once", async () => {
  const { apps, redis, stop } = await createInstances(1, { countdownMs: 0 });
  const [app] = apps as [App];
  try {
    // Both Participants stay connected and silent: they are told of each step exactly as often as it happens.
    const { duelId, sockets, countdown } = await startDuel(app);
    const relays = [createRelay(redis), createRelay(redis)];
    const sweep = (now: number) =>
      Promise.all(
        relays.map((relay) =>
          sweepDuels(testDb.db, redis, relay, delays, now, getLogger("api.duel")),
        ),
      );
    const first = countdown.startAt;
    for (const startAt of [first, first + 40_000, first + 80_000]) {
      await sweep(startAt - 3000);
      await sweep(startAt + 32_000);
    }
    // Swept again once finalised: nothing is left to do.
    await sweep(first + 200_000);

    const received: ServerMessage[][] = [[], []];
    for (const [seat, socket] of sockets.entries())
      while (received[seat]?.at(-1)?.type !== "end") received[seat]?.push(await socket.next());
    const silent = [await sockets[0].staysSilent(300), await sockets[1].staysSilent(0)];
    for (const socket of sockets) socket.close();

    expect(silent).toEqual([true, true]);
    for (const messages of received) {
      // Each also saw the other arrive, before or after the first Countdown.
      const steps = messages.filter(({ type }) => type !== "presence");
      expect(steps.map(({ type }) => type)).toEqual([
        "roundEnd",
        "countdown",
        "roundEnd",
        "countdown",
        "roundEnd",
        "end",
      ]);
      expect(messages.at(-1)).toMatchObject({ outcomes: ["draw", "draw"] });
    }
    expect(await testDb.db.select().from(duel).where(eq(duel.id, duelId))).toHaveLength(1);
    expect(
      await testDb.db.select().from(duelRound).where(eq(duelRound.duelId, duelId)),
    ).toHaveLength(3);
    expect(await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, duelId))).toHaveLength(
      6,
    );
  } finally {
    await stop();
  }
});

test("a finalisation that failed is tried again until it succeeds: the Duel is saved once and its end announced", async () => {
  let failuresLeft = 3;
  // The real database, but for its first transactions, refused as by a database out of reach.
  const flakyDb = new Proxy(testDb.db, {
    get: (target, key) => {
      if (key === "transaction" && failuresLeft > 0) {
        failuresLeft -= 1;
        return () => Promise.reject(new Error("The database cannot be reached"));
      }
      const value: unknown = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const { apps, stop } = await createInstances(1, { countdownMs: 0, roundPauseMs: 0 }, flakyDb);
  const [app] = apps as [App];
  try {
    const { duelId, sockets, countdown } = await startDuel(app);
    playGame(sockets[0], 1, `${countdown.words[0]} `);
    playGame(sockets[1], 1);
    const second = await nextOfType(sockets[0], "countdown");
    await nextOfType(sockets[1], "countdown");
    await Bun.sleep(Math.max(0, second.startAt - Date.now()));
    playGame(sockets[0], 2, `${second.words[0]} `);
    playGame(sockets[1], 2);

    const ends = [await nextOfType(sockets[0], "end"), await nextOfType(sockets[1], "end")];
    const silent = await sockets[0].staysSilent(300);
    for (const socket of sockets) socket.close();

    expect(failuresLeft).toBe(0);
    expect(ends[0]).toMatchObject({ type: "end", outcomes: ["win", "loss"] });
    expect(ends[1]).toEqual(ends[0]);
    expect(silent).toBe(true);
    expect(await testDb.db.select().from(duel).where(eq(duel.id, duelId))).toHaveLength(1);
    expect(await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, duelId))).toHaveLength(
      4,
    );
  } finally {
    await stop();
  }
});

test("a finalisation that keeps failing is given up once the Duel has expired", async () => {
  let attempts = 0;
  const brokenDb = new Proxy(testDb.db, {
    get: (target, key) => {
      if (key === "transaction")
        return () => {
          attempts += 1;
          return Promise.reject(new Error("The database cannot be reached"));
        };
      const value: unknown = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const options = { countdownMs: 0, roundPauseMs: 0, expiryMs: 600 };
  const { apps, stop } = await createInstances(1, options, brokenDb);
  const [app] = apps as [App];
  try {
    const { sockets, countdown } = await startDuel(app);
    playGame(sockets[0], 1, `${countdown.words[0]} `);
    playGame(sockets[1], 1);
    const second = await nextOfType(sockets[0], "countdown");
    await Bun.sleep(Math.max(0, second.startAt - Date.now()));
    playGame(sockets[0], 2, `${second.words[0]} `);
    playGame(sockets[1], 2);
    await Bun.sleep(1000);
    for (const socket of sockets) socket.close();

    const attemptsOnceExpired = attempts;
    await Bun.sleep(400);
    expect(attemptsOnceExpired).toBeGreaterThan(1);
    expect(attempts).toBe(attemptsOnceExpired);
  } finally {
    await stop();
  }
});

test("a Custom Duel nobody joined still expires, and leaves no row and nothing to sweep", async () => {
  const { apps, redis, stop } = await createInstances(1, { expiryMs: 200 });
  const [app] = apps as [App];
  try {
    const cookie = await signInCookie(app);
    const created = await fetch(`${originOf(app)}/api/duels`, {
      method: "POST",
      headers: { cookie },
    });
    const { id } = (await created.json()) as { id: string };

    await Bun.sleep(600);
    const read = await fetch(`${originOf(app)}/api/duels/${id}`, { headers: { cookie } });

    expect(read.status).toBe(404);
    expect(await testDb.db.select().from(duel).where(eq(duel.id, id))).toEqual([]);
    // The rate limit counters of the requests above outlive the Duel by design: they expire with their own window.
    const keys: string[] = await redis.client.send("KEYS", [redis.name("*")]);
    expect(keys.filter((key) => !key.startsWith(redis.name("rate-limit", "")))).toEqual([]);
  } finally {
    await stop();
  }
});
