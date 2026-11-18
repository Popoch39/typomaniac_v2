import { afterAll, expect, test } from "bun:test";
import type { ServerMessage } from "@repo/duel-engine";
import type { QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import type { Standing } from "@repo/ranked-engine";
import { eq } from "drizzle-orm";
import { createApp } from "../src/app.ts";
import { duel, duelParticipant } from "../src/db/schema.ts";
import { tickMatchmaker } from "../src/modules/queue/service.ts";
import { readStanding, saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket, openSocketOf } from "./helpers/socket.ts";

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

const signIn = async (origin: string, standing?: Standing) => {
  const { player, cookie } = await signInPlayer(auth);
  const response = await fetch(`${origin}/api/me/nickname`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ nickname: `p_${crypto.randomUUID().slice(0, 8)}` }),
  });
  expect(response.status).toBe(200);
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
// them and both accept. Each test gets its own Redis namespace, so nobody else is ever queued.
const openRankedDuel = async (
  standings: readonly [Standing?, Standing?] = [],
  { instances = 1, db = testDb.db } = {},
) => {
  const testRedis = await createTestRedis();
  const apps = Array.from({ length: instances }, () =>
    createApp(db, auth, testRedis.redis, { countdownMs: 0, roundPauseMs: 0 }).listen(0),
  );
  closers.push(async () => {
    for (const app of apps) await app.stop(true);
    await testRedis.drop();
  });
  const origins = apps.map((app) => `http://localhost:${app.server?.port}`);
  const origin = origins[0] ?? "";
  const accounts = [
    await signIn(origin, standings[0]),
    await signIn(origin, standings[1]),
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
  for (const socket of queued) {
    const proposal = await socket.next();
    if (proposal.type !== "proposed") throw new Error(`Expected proposed, got ${proposal.type}`);
    socket.send({ type: "accept", pairingId: proposal.pairingId });
  }
  const paired = [];
  for (const socket of queued) paired.push(await socket.next());
  const [pairing] = paired;
  if (pairing?.type !== "paired") throw new Error(`Expected paired, got ${pairing?.type}`);
  const { duelId } = pairing;
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
  expect(await visibleStandingOf(origin, first)).toEqual(newcomer);
  expect(await visibleStandingOf(origin, second)).toEqual(newcomer);
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
  expect(await visibleStandingOf(origin, first)).toEqual({
    rank: { tier: "silver", division: 2, lp: 0 },
    placement,
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
  expect(await visibleStandingOf(origin, first)).toEqual(promoted);
  expect(await visibleStandingOf(origin, second)).toEqual(demoted);
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
    placement: { played: 0, total: 5 },
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
