import { afterAll, expect, test } from "bun:test";
import type { ServerMessage } from "@repo/duel-engine";
import type { QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import type { Standing } from "@repo/ranked-engine";
import { eq } from "drizzle-orm";
import { createApp } from "../src/app.ts";
import type { DuelOptions } from "../src/modules/duel/index.ts";
import { createRelay } from "../src/modules/duel/relay.ts";
import { DUEL_EXPIRY_MS, sweepDuels } from "../src/modules/duel/service.ts";
import { duel, duelGame, duelParticipant, duelRound } from "../src/db/schema.ts";
import { tickMatchmaker } from "../src/modules/queue/service.ts";
import { readStanding, saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayerWithNickname } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket, openSocketOf, requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const auth = createTestAuth(testDb.db);
const closers: (() => Promise<void>)[] = [];
afterAll(async () => {
  for (const close of closers) await close();
  await testDb.drop();
});

type Socket = Awaited<ReturnType<typeof openSocket>>;

const isOfType = <Type extends ServerMessage["type"]>(
  message: ServerMessage,
  type: Type,
): message is Extract<ServerMessage, { type: Type }> => message.type === type;

// Skips what may come before the awaited message, and keeps everything read in `received`.
const nextOfType = async <Type extends ServerMessage["type"]>(
  { socket, received }: { socket: Socket; received: ServerMessage[] },
  type: Type,
) => {
  for (;;) {
    const message = await socket.next();
    received.push(message);
    if (isOfType(message, type)) return message;
  }
};

const signIn = async (origin: string, standing?: Standing, image?: string) => {
  const { player, cookie } = await signInPlayerWithNickname(auth, origin, { image });
  if (standing) await saveStanding(testDb.db, player.id, standing);
  return { id: player.id, cookie };
};

const visibleStandingOf = async (origin: string, { cookie }: { cookie: string }) =>
  (await fetch(`${origin}/api/me/standing`, { headers: { cookie } })).json();

// Seats two Players in a Duel, each on the instance given for them, up to the Start of its first
// Round. Rounds follow one another at once: no Countdown and no pause.
const seat = async (
  origins: readonly string[],
  duelId: string,
  players: readonly [{ id: string; cookie: string }, { id: string; cookie: string }],
) => {
  const seated = [];
  for (const [index, player] of players.entries()) {
    const origin = origins[index % origins.length] ?? "";
    const socket = await openSocket(
      `${origin.replace(/^http/, "ws")}/api/duels/${duelId}/socket`,
      player.cookie,
    );
    const received: ServerMessage[] = [];
    const state = await nextOfType({ socket, received }, "state");
    seated.push({ ...player, socket, received, seat: state.seat });
  }
  const [first, second] = seated;
  if (!first || !second) throw new Error("Expected two Players");
  return [first, second] as const;
};

type Seated = Awaited<ReturnType<typeof seat>>;

/**
 * Plays a Duel to its end. Each Round goes to the Player named, who types its first Target word
 * while the other types nothing, or is drawn. Every Game ends on a Tick stamped 30 seconds ahead.
 */
const play = async (players: Seated, rounds: readonly ("first" | "second" | "draw")[]) => {
  for (const [index, winner] of rounds.entries()) {
    const round = index + 1;
    const countdowns = [];
    for (const player of players) countdowns.push(await nextOfType(player, "countdown"));
    const [countdown] = countdowns;
    if (!countdown || countdowns.some((other) => other.round !== round))
      throw new Error(`Expected the Countdown of Round ${round}`);
    await Bun.sleep(Math.max(0, countdown.startAt - Date.now()));
    for (const [position, { socket }] of players.entries()) {
      const types = winner === (position === 0 ? "first" : "second");
      socket.send({ type: "event", round, event: { type: "start", at: 10 } });
      if (types)
        socket.send({
          type: "event",
          round,
          event: { type: "insert", at: 1010, text: `${countdown.words[0]} ` },
        });
      socket.send({ type: "event", round, event: { type: "tick", at: 30_010 } });
    }
    for (const player of players) await nextOfType(player, "roundEnd");
  }
  return [await nextOfType(players[0], "end"), await nextOfType(players[1], "end")] as const;
};

// A ranked Duel as the Queue creates it: both Players enter the Queue, the matchmaker's tick pairs
// them and both accept. Nobody is seated yet. Each test gets its own Redis namespace, so nobody else
// is ever queued. `createdAt` brackets the instant the Duel was created.
const pairRankedDuel = async (
  standings: readonly [Standing?, Standing?] = [],
  {
    instances = 1,
    db = testDb.db,
    options = { countdownMs: 0, roundPauseMs: 0 } as DuelOptions,
    images = [] as readonly [string?, string?],
  } = {},
) => {
  const testRedis = await createTestRedis();
  const apps = Array.from({ length: instances }, () =>
    createApp(db, auth, testRedis.redis, options).listen(0),
  );
  closers.push(async () => {
    for (const app of apps) await app.stop(true);
    await testRedis.drop();
  });
  const origins = apps.map((app) => `http://localhost:${app.server?.port}`);
  const origin = origins[0] ?? "";
  const accounts = [
    await signIn(origin, standings[0], images[0]),
    await signIn(origin, standings[1], images[1]),
  ] as const;
  const queued = [];
  for (const { cookie } of accounts) {
    const socket = await openSocketOf<QueueServerMessage, QueueClientMessage>(
      `${origin.replace(/^http/, "ws")}/api/queue/socket`,
      cookie,
    );
    await socket.next();
    queued.push(socket);
  }
  await tickMatchmaker(testRedis.redis, Date.now());
  const before = Date.now();
  for (const socket of queued) {
    const proposal = await socket.next();
    if (proposal.type !== "proposed") throw new Error(`Expected proposed, got ${proposal.type}`);
    socket.send({ type: "accept", pairingId: proposal.pairingId });
  }
  const paired = [];
  for (const socket of queued) paired.push(await socket.next());
  const [pairing] = paired;
  if (pairing?.type !== "paired") throw new Error(`Expected paired, got ${pairing?.type}`);
  const createdAt = { before, after: Date.now() };
  const { duelId } = pairing;
  return { duelId, apps, redis: testRedis.redis, origins, origin, accounts, createdAt };
};

const openRankedDuel = async (...args: Parameters<typeof pairRankedDuel>) => {
  const { duelId, origins, origin, accounts } = await pairRankedDuel(...args);
  return { duelId, origin, players: await seat(origins, duelId, accounts) };
};

const savedParticipants = (duelId: string) =>
  testDb.db
    .select()
    .from(duelParticipant)
    .where(eq(duelParticipant.duelId, duelId))
    .orderBy(duelParticipant.seat);

const newcomer = { rank: null, placement: { played: 1, total: 5 } };
const toldInPlacement = { lpDelta: 0, rankChange: "none", ...newcomer } as const;

// Two Players of Gold II, whose reference MMR is 1400, past their Placement.
const goldTwo = (lp: number): Standing => ({
  mmr: 1400,
  duelsPlayed: 10,
  rank: { tier: "gold", division: 2, lp },
});
// Gold II is the eleventh Division of the ladder, counted from Bronze IV at 0.
const GOLD_TWO = 10;

test("a Placement Duel moves each Player's MMR and ranked Duels played, leaves both Unranked, and tells each their Placement progress", async () => {
  const { duelId, origin, players } = await openRankedDuel();
  const [first, second] = players;

  const ends = await play(players, ["first", "first"]);

  expect(ends[0]).toEqual(ends[1]);
  expect(ends[0].outcomes[first.seat]).toBe("win");
  expect(ends[0].ranked).toEqual([toldInPlacement, toldInPlacement]);
  // Two new Players at 1200 MMR, with the Placement K-factor of 64: 32 either way.
  expect(await readStanding(testDb.db, first.id)).toEqual({
    mmr: 1232,
    duelsPlayed: 1,
    rank: null,
  });
  expect(await readStanding(testDb.db, second.id)).toEqual({
    mmr: 1168,
    duelsPlayed: 1,
    rank: null,
  });
  expect(await visibleStandingOf(origin, first)).toEqual({
    rank: null,
    placement: { ...newcomer.placement, outcomes: ["win"] },
  });
  expect(await visibleStandingOf(origin, second)).toEqual({
    rank: null,
    placement: { ...newcomer.placement, outcomes: ["loss"] },
  });
  expect(await testDb.db.select({ kind: duel.kind }).from(duel).where(eq(duel.id, duelId))).toEqual(
    [{ kind: "ranked" }],
  );
});

test("only the Outcome of a ranked Duel counts: a Duel won 2-1 moves both Standings as one won 2-0", async () => {
  const { players } = await openRankedDuel();
  const [first, second] = players;

  const ends = await play(players, ["first", "second", "first"]);

  expect(ends[0].outcomes[first.seat]).toBe("win");
  expect(ends[0].rounds).toHaveLength(3);
  expect(await readStanding(testDb.db, first.id)).toEqual({
    mmr: 1232,
    duelsPlayed: 1,
    rank: null,
  });
  expect(await readStanding(testDb.db, second.id)).toEqual({
    mmr: 1168,
    duelsPlayed: 1,
    rank: null,
  });
});

test("the ranked Duel is saved with each Player's Standing before and after, the LP delta and the rank change", async () => {
  const { duelId, players } = await openRankedDuel([goldTwo(40), goldTwo(60)]);
  const [first, second] = players;

  await play(players, ["first", "first"]);

  // At equal MMR with the K-factor of 32, 16 either way: 3 LP more than the 20 of an even Duel.
  const saved = await savedParticipants(duelId);
  expect([saved[first.seat], saved[second.seat]]).toEqual([
    {
      duelId,
      seat: first.seat,
      playerId: first.id,
      outcome: "win",
      mmrBefore: 1400,
      mmrAfter: 1416,
      duelsPlayedBefore: 10,
      duelsPlayedAfter: 11,
      ladderIndexBefore: GOLD_TWO,
      lpBefore: 40,
      ladderIndexAfter: GOLD_TWO,
      lpAfter: 63,
      lpDelta: 23,
      rankChange: "none",
    },
    {
      duelId,
      seat: second.seat,
      playerId: second.id,
      outcome: "loss",
      mmrBefore: 1400,
      mmrAfter: 1384,
      duelsPlayedBefore: 10,
      duelsPlayedAfter: 11,
      ladderIndexBefore: GOLD_TWO,
      lpBefore: 60,
      ladderIndexAfter: GOLD_TWO,
      lpAfter: 37,
      lpDelta: -23,
      rankChange: "none",
    },
  ]);
});

test("the last Placement Duel gives a Player their first Rank, and tells them so", async () => {
  // Silver II is the Division whose reference MMR, 1200, is the highest at or below 1232.
  const { origin, players } = await openRankedDuel([
    { mmr: 1200, duelsPlayed: 4, rank: null },
    { mmr: 1200, duelsPlayed: 4, rank: null },
  ]);
  const [first, second] = players;

  const [end] = await play(players, ["first", "first"]);

  const placement = { played: 5, total: 5 };
  expect(end.ranked?.[first.seat]).toEqual({
    lpDelta: 0,
    rankChange: "placed",
    rank: { tier: "silver", division: 2, lp: 0 },
    placement,
  });
  // The loser, at 1168 MMR, is placed one Division lower: Silver III, from 1150.
  expect(end.ranked?.[second.seat]).toEqual({
    lpDelta: 0,
    rankChange: "placed",
    rank: { tier: "silver", division: 3, lp: 0 },
    placement,
  });
  // Only the last Placement Duel was played here: the four before it were stored as a Standing.
  expect(await visibleStandingOf(origin, first)).toEqual({
    rank: { tier: "silver", division: 2, lp: 0 },
    placement: { ...placement, outcomes: ["win"] },
  });
});

test("a win that reaches 100 LP promotes the Player, and a loss at 0 LP demotes the Opponent", async () => {
  const { origin, players } = await openRankedDuel([goldTwo(90), goldTwo(0)]);
  const [first, second] = players;

  const [end] = await play(players, ["first", "first"]);

  const placement = { played: 5, total: 5 };
  // 90 LP and 23 won: Gold I with the 13 LP beyond 100.
  const promoted = { rank: { tier: "gold", division: 1, lp: 13 }, placement } as const;
  // 23 LP lost at 0 LP: Gold III, at the 75 LP a demotion lands on.
  const demoted = { rank: { tier: "gold", division: 3, lp: 75 }, placement } as const;
  expect(end.ranked?.[first.seat]).toEqual({ lpDelta: 23, rankChange: "promoted", ...promoted });
  expect(end.ranked?.[second.seat]).toEqual({ lpDelta: -23, rankChange: "demoted", ...demoted });
  // A Duel played past the Placement adds no Outcome to it.
  const told = { placement: { ...placement, outcomes: [] } };
  expect(await visibleStandingOf(origin, first)).toEqual({ ...promoted, ...told });
  expect(await visibleStandingOf(origin, second)).toEqual({ ...demoted, ...told });
});

test("a drawn ranked Duel leaves the LP of both Players unchanged, and still counts as a ranked Duel played", async () => {
  const { players } = await openRankedDuel([goldTwo(50), goldTwo(50)]);

  const [end] = await play(players, ["draw", "draw", "draw"]);

  const told = {
    lpDelta: 0,
    rankChange: "none",
    rank: { tier: "gold", division: 2, lp: 50 },
    placement: { played: 5, total: 5 },
  } as const;
  expect(end.outcomes).toEqual(["draw", "draw"]);
  expect(end.ranked).toEqual([told, told]);
  for (const { id } of players)
    expect(await readStanding(testDb.db, id)).toEqual({ ...goldTwo(50), duelsPlayed: 11 });
});

test("the MMR is in no message of a ranked Duel", async () => {
  // MMRs no other figure of the ranked part could equal.
  const { players } = await openRankedDuel([
    { ...goldTwo(40), mmr: 1397 },
    { ...goldTwo(60), mmr: 1403 },
  ]);

  const ends = await play(players, ["first", "first"]);

  for (const { received } of players)
    expect(JSON.stringify(received).toLowerCase()).not.toContain("mmr");
  // Before the Duel, and after it: 16 either way.
  for (const { ranked } of ends)
    for (const hidden of [1397, 1403, 1413, 1387])
      expect(JSON.stringify(ranked)).not.toContain(String(hidden));
});

test("a Custom Duel between two Players leaves both Standings untouched, and its end carries no ranked part", async () => {
  const testRedis = await createTestRedis();
  const app = createApp(testDb.db, auth, testRedis.redis, {
    countdownMs: 0,
    roundPauseMs: 0,
  }).listen(0);
  closers.push(async () => {
    await app.stop(true);
    await testRedis.drop();
  });
  const origin = `http://localhost:${app.server?.port}`;
  const accounts = [await signIn(origin, goldTwo(40)), await signIn(origin)] as const;
  const created = await fetch(`${origin}/api/duels`, {
    method: "POST",
    headers: { cookie: accounts[0].cookie },
  });
  const { id: duelId } = (await created.json()) as { id: string };
  const players = await seat([origin], duelId, accounts);

  const [end] = await play(players, ["first", "first"]);

  expect(end.ranked).toBeNull();
  expect(await readStanding(testDb.db, accounts[0].id)).toEqual(goldTwo(40));
  expect(await visibleStandingOf(origin, accounts[1])).toEqual({
    rank: null,
    placement: { played: 0, total: 5, outcomes: [] },
  });
});

test("with two API instances ending the ranked Duel at once, each Standing moves exactly once and both Players are told the same end once", async () => {
  // Each Player on their own instance, and both final Ticks of a Round sent together.
  const { duelId, players } = await openRankedDuel([], { instances: 2 });
  const [first, second] = players;

  const ends = await play(players, ["first", "first"]);
  const silent = [await first.socket.staysSilent(300), await second.socket.staysSilent(0)];

  expect(ends[0]).toEqual(ends[1]);
  expect(ends[0].ranked).toEqual([toldInPlacement, toldInPlacement]);
  expect(silent).toEqual([true, true]);
  expect(await readStanding(testDb.db, first.id)).toEqual({
    mmr: 1232,
    duelsPlayed: 1,
    rank: null,
  });
  expect(await readStanding(testDb.db, second.id)).toEqual({
    mmr: 1168,
    duelsPlayed: 1,
    rank: null,
  });
  expect(await savedParticipants(duelId)).toHaveLength(2);
});

test("a finalisation retried after its save moves no Standing again, and announces the end the save decided", async () => {
  let failuresLeft = 1;
  // The real database, whose first transaction is committed and then reported as failed, as when
  // the connection is lost before the answer: the Duel is saved, and its finalisation fails.
  const flakyDb = new Proxy(testDb.db, {
    get: (target, key) => {
      const value: unknown = Reflect.get(target, key);
      if (key === "transaction" && failuresLeft > 0)
        return async (...run: Parameters<typeof target.transaction>) => {
          failuresLeft -= 1;
          await target.transaction(...run);
          throw new Error("The database stopped answering");
        };
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const { duelId, players } = await openRankedDuel([goldTwo(90), goldTwo(0)], { db: flakyDb });
  const [first, second] = players;

  // The finalisation is tried again at the deadline of the last Round.
  const ends = await play(players, ["first", "first"]);
  const silent = [await first.socket.staysSilent(300), await second.socket.staysSilent(0)];

  expect(failuresLeft).toBe(0);
  const placement = { played: 5, total: 5 };
  expect(ends[0]).toEqual(ends[1]);
  expect(ends[0].ranked?.[first.seat]).toEqual({
    lpDelta: 23,
    rankChange: "promoted",
    rank: { tier: "gold", division: 1, lp: 13 },
    placement,
  });
  expect(ends[0].ranked?.[second.seat]).toEqual({
    lpDelta: -23,
    rankChange: "demoted",
    rank: { tier: "gold", division: 3, lp: 75 },
    placement,
  });
  expect(silent).toEqual([true, true]);
  expect(await readStanding(testDb.db, first.id)).toEqual({
    mmr: 1416,
    duelsPlayed: 11,
    rank: { tier: "gold", division: 1, lp: 13 },
  });
  expect(await readStanding(testDb.db, second.id)).toEqual({
    mmr: 1384,
    duelsPlayed: 11,
    rank: { tier: "gold", division: 3, lp: 75 },
  });
  expect(await savedParticipants(duelId)).toHaveLength(2);
}, 40_000);

const queueSocketUrl = (origin: string) => `${origin.replace(/^http/, "ws")}/api/queue/socket`;

test("the Queue refuses a Player while their ranked Duel is unfinished, says why over HTTP with the Duel, and accepts them again once it has ended", async () => {
  const { duelId, origins, origin, accounts } = await pairRankedDuel();
  const [first] = accounts;

  const refused = await requestUpgrade(queueSocketUrl(origin), first.cookie);
  expect(refused.status).toBe(409);
  expect(await refused.json()).toEqual({ code: "RANKED_DUEL_UNFINISHED", duelId });
  const reason = await fetch(`${origin}/api/queue`, { headers: { cookie: first.cookie } });
  expect(reason.status).toBe(409);
  expect(await reason.json()).toEqual({ code: "RANKED_DUEL_UNFINISHED", duelId });

  await play(await seat(origins, duelId, accounts), ["first", "first"]);

  const socket = await openSocketOf<QueueServerMessage, QueueClientMessage>(
    queueSocketUrl(origin),
    first.cookie,
  );
  expect(await socket.next()).toMatchObject({ type: "queued" });
  socket.close();
});

test("the first Round of a ranked Duel starts as soon as both Players are connected", async () => {
  // Far from the time to connect: only both Players being there can announce the Countdown.
  const { duelId, origins, accounts, createdAt } = await pairRankedDuel([], {
    options: { countdownMs: 0, connectMs: 60_000 },
  });

  const players = await seat(origins, duelId, accounts);
  const countdowns = [
    await nextOfType(players[0], "countdown"),
    await nextOfType(players[1], "countdown"),
  ];

  for (const { round, startAt } of countdowns) {
    expect(round).toBe(1);
    expect(startAt - createdAt.after).toBeLessThan(1000);
  }
});

// The delays of the instances a test stands in for when it sweeps at instants of its own.
const sweptDelays = { expiryMs: DUEL_EXPIRY_MS, countdownMs: 3000, roundPauseMs: 5000 };

test("a ranked Duel nobody connects to has its Countdown announced 10 seconds after its creation, and is played to its end and saved as ranked, every Game at 0 WPM", async () => {
  const { duelId, apps, redis, accounts, createdAt } = await pairRankedDuel();
  // Nobody is left to connect, and no instance sweeps but the test.
  for (const app of apps) await app.stop(true);
  const relay = createRelay(redis);
  const sweep = (now: number) => sweepDuels(testDb.db, redis, relay, sweptDelays, now);

  // Not yet 10 seconds after the creation: nothing is announced.
  await sweep(createdAt.before + 9999);
  await sweep(createdAt.after + 10_000);
  const first = createdAt.after + 10_000 + 3000;
  const starts = [first, first + 40_000, first + 80_000];
  for (const startAt of starts) {
    await sweep(startAt - 3000);
    await sweep(startAt + 32_000);
  }

  expect(await testDb.db.select({ kind: duel.kind }).from(duel).where(eq(duel.id, duelId))).toEqual(
    [{ kind: "ranked" }],
  );
  const rounds = await testDb.db
    .select()
    .from(duelRound)
    .where(eq(duelRound.duelId, duelId))
    .orderBy(duelRound.round);
  expect(rounds.map(({ startedAt }) => startedAt.getTime())).toEqual(starts);
  const games = await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, duelId));
  expect(games).toHaveLength(6);
  for (const { result } of games) expect(result.wpm).toBe(0);
  expect((await savedParticipants(duelId)).map(({ outcome }) => outcome)).toEqual(["draw", "draw"]);
  for (const { id } of accounts)
    expect(await readStanding(testDb.db, id)).toEqual({ mmr: 1200, duelsPlayed: 1, rank: null });
});

test("a ranked Duel with one Player connected starts without the other once the time to connect has passed, and is played to its end and saved, the absent Games at 0 WPM", async () => {
  const connectMs = 200;
  const { duelId, origin, redis, accounts, createdAt } = await pairRankedDuel([], {
    options: { countdownMs: 0, roundPauseMs: 0, connectMs },
  });
  const [present, absent] = accounts;
  const socket = await openSocket(
    `${origin.replace(/^http/, "ws")}/api/duels/${duelId}/socket`,
    present.cookie,
  );
  const player = { socket, received: [] as ServerMessage[] };
  const { seat: presentSeat } = await nextOfType(player, "state");

  const countdown = await nextOfType(player, "countdown");
  expect(countdown.startAt).toBeGreaterThanOrEqual(createdAt.before + connectMs);
  await Bun.sleep(Math.max(0, countdown.startAt - Date.now()));
  socket.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
  socket.send({
    type: "event",
    round: 1,
    event: { type: "insert", at: 1010, text: `${countdown.words[0]} ` },
  });
  socket.send({ type: "event", round: 1, event: { type: "tick", at: 30_010 } });
  // The Games left open are closed at their deadlines, those of the present Player too from the
  // second Round on: the sweeps stand for the instants they fall due.
  const relay = createRelay(redis);
  const delays = { expiryMs: DUEL_EXPIRY_MS, countdownMs: 0, roundPauseMs: 0 };
  const sweep = (now: number) => sweepDuels(testDb.db, redis, relay, delays, now);
  const starts = [countdown.startAt, countdown.startAt + 32_000, countdown.startAt + 64_000];
  for (const startAt of starts) {
    await sweep(startAt);
    await sweep(startAt + 32_000);
  }
  const end = await nextOfType(player, "end");

  expect(end.outcomes[presentSeat]).toBe("win");
  expect(end.ranked?.[presentSeat]).toEqual(toldInPlacement);
  const games = await testDb.db
    .select()
    .from(duelGame)
    .where(eq(duelGame.duelId, duelId))
    .orderBy(duelGame.round, duelGame.seat);
  const absentGames = games.filter(({ seat }) => seat !== presentSeat);
  expect(absentGames).toHaveLength(3);
  for (const { result } of absentGames) expect(result.wpm).toBe(0);
  expect(absentGames[0]?.journal).toEqual([
    { type: "start", at: countdown.startAt },
    { type: "tick", at: countdown.startAt + 30_000 },
  ]);
  expect(await readStanding(testDb.db, present.id)).toEqual({
    mmr: 1232,
    duelsPlayed: 1,
    rank: null,
  });
  expect(await readStanding(testDb.db, absent.id)).toEqual({
    mmr: 1168,
    duelsPlayed: 1,
    rank: null,
  });
  socket.close();
});

test("each Player of a ranked Duel is shown both Avatars, none for a Player without a picture", async () => {
  const avatarUrl = "https://avatars.githubusercontent.com/u/2?v=4";
  const { players } = await openRankedDuel([], { images: [avatarUrl] });
  const bySeat = players
    .map(({ seat: playerSeat }, index) => ({
      seat: playerSeat,
      avatarUrl: index === 0 ? avatarUrl : null,
    }))
    .toSorted((a, b) => a.seat - b.seat);
  for (const { received } of players) {
    const state = received.find((message) => isOfType(message, "state"));
    expect(state).toMatchObject({ participants: bySeat });
  }
});

test("each Player of a ranked Duel is shown both Ornaments, the Unranked plate for an Unranked Player", async () => {
  // At the MMR of a new Player, so that both are paired at once.
  const { players } = await openRankedDuel([{ ...goldTwo(40), mmr: 1200 }]);
  const bySeat = players
    .map(({ seat: playerSeat }, index) => ({
      seat: playerSeat,
      ornament: index === 0 ? { tier: "gold", division: 2 } : { tier: "unranked", division: null },
    }))
    .toSorted((a, b) => a.seat - b.seat);
  for (const { received } of players) {
    const state = received.find((message) => isOfType(message, "state"));
    expect(state).toMatchObject({ participants: bySeat });
  }
});

test("each Player of a ranked Duel is shown both Ranks, Unranked as none, and a Custom Duel shows no Rank", async () => {
  // At the MMR of a new Player, so that both are paired at once.
  const ranked = await openRankedDuel([{ ...goldTwo(40), mmr: 1200 }]);
  const ranks = ranked.players.map(({ seat: playerSeat }, index) => ({
    seat: playerSeat,
    rank: index === 0 ? { tier: "gold", division: 2, lp: 40 } : null,
  }));
  const bySeat = ranks.toSorted((a, b) => a.seat - b.seat).map(({ rank }) => rank);
  for (const { received } of ranked.players) {
    const state = received.find((message) => isOfType(message, "state"));
    expect(state).toMatchObject({ ranks: bySeat });
  }

  const testRedis = await createTestRedis();
  const app = createApp(testDb.db, auth, testRedis.redis).listen(0);
  closers.push(async () => {
    await app.stop(true);
    await testRedis.drop();
  });
  const origin = `http://localhost:${app.server?.port}`;
  const accounts = [await signIn(origin, goldTwo(40)), await signIn(origin)] as const;
  const created = await fetch(`${origin}/api/duels`, {
    method: "POST",
    headers: { cookie: accounts[0].cookie },
  });
  const { id: duelId } = (await created.json()) as { id: string };
  const custom = await seat([origin], duelId, accounts);
  for (const { received } of custom) {
    const state = received.find((message) => isOfType(message, "state"));
    expect(state).toMatchObject({ ranks: null });
  }
});
