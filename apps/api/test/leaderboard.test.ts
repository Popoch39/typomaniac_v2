import { afterAll, expect, test } from "bun:test";
import type { OrnamentChoice, Standing } from "@repo/ranked-engine";
import { createApp } from "../src/app.ts";
import { user } from "../src/db/schema.ts";
import { eq, sql } from "drizzle-orm";
import { leaderboardTop, saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
afterAll(async () => {
  await testRedis.drop();
  await testDb.drop();
});
const auth = createTestAuth(testDb.db);
const app = createApp(testDb.db, auth, testRedis.redis);

// The Leaderboard lists every ranked Player of the database: each test starts from a database of
// this file with no Player, so that what another test stored never shows in its list.
const createLeaderboard = async () => {
  await testDb.db.execute(sql`truncate "user" cascade`);

  // Stored directly: a Player made through the auth flow is too slow for a list of more than 100.
  const addPlayer = async (nickname: string, standing: Standing, image: string | null = null) => {
    const id = crypto.randomUUID();
    await testDb.db
      .insert(user)
      .values({ id, name: nickname, email: `${id}@example.com`, nickname, image });
    await saveStanding(testDb.db, id, standing);
    return id;
  };
  // Stored directly, as the Peak Tier that the PUT route checks plays no part in what is listed.
  const chooseOrnament = (playerId: string, choice: OrnamentChoice) =>
    testDb.db.update(user).set({ ornament: choice }).where(eq(user.id, playerId));
  const read = (cookie?: string) =>
    app.handle(
      new Request("http://localhost/api/leaderboard", { headers: cookie ? { cookie } : {} }),
    );
  return { db: testDb.db, auth, addPlayer, chooseOrnament, read };
};

test("a Guest reads the ranked Players by Tier, Division and LP, with their Nickname, Avatar and Rank", async () => {
  const { addPlayer, read } = await createLeaderboard();
  await addPlayer("silver", {
    mmr: 1300,
    duelsPlayed: 12,
    rank: { tier: "silver", division: 1, lp: 80 },
  });
  await addPlayer(
    "master",
    { mmr: 2100, duelsPlayed: 90, rank: { tier: "master", lp: 15 } },
    "https://cdn.example.com/master.png",
  );
  await addPlayer("goldLow", {
    mmr: 1400,
    duelsPlayed: 30,
    rank: { tier: "gold", division: 3, lp: 10 },
  });
  await addPlayer("goldHigh", {
    mmr: 1390,
    duelsPlayed: 30,
    rank: { tier: "gold", division: 3, lp: 60 },
  });
  await addPlayer("goldTop", {
    mmr: 1380,
    duelsPlayed: 30,
    rank: { tier: "gold", division: 1, lp: 0 },
  });

  const response = await read();

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    players: [
      {
        position: 1,
        nickname: "master",
        avatarUrl: "https://cdn.example.com/master.png",
        rank: { tier: "master", lp: 15 },
        ornament: { tier: "master", division: null },
      },
      {
        position: 2,
        nickname: "goldTop",
        avatarUrl: null,
        rank: { tier: "gold", division: 1, lp: 0 },
        ornament: { tier: "gold", division: 1 },
      },
      {
        position: 3,
        nickname: "goldHigh",
        avatarUrl: null,
        rank: { tier: "gold", division: 3, lp: 60 },
        ornament: { tier: "gold", division: 3 },
      },
      {
        position: 4,
        nickname: "goldLow",
        avatarUrl: null,
        rank: { tier: "gold", division: 3, lp: 10 },
        ornament: { tier: "gold", division: 3 },
      },
      {
        position: 5,
        nickname: "silver",
        avatarUrl: null,
        rank: { tier: "silver", division: 1, lp: 80 },
        ornament: { tier: "silver", division: 1 },
      },
    ],
    own: null,
  });
});

const gold = (lp: number) => ({ tier: "gold", division: 2, lp }) as const;

const nicknamesOf = async (response: Response) =>
  ((await response.json()) as { players: { nickname: string }[] }).players.map(
    ({ nickname }) => nickname,
  );

test("Unranked Players, in Placement or new, are not listed", async () => {
  const { addPlayer, read } = await createLeaderboard();
  await addPlayer("inPlacement", { mmr: 1900, duelsPlayed: 4, rank: null });
  await addPlayer("ranked", { mmr: 1000, duelsPlayed: 5, rank: gold(0) });

  expect(await nicknamesOf(await read())).toEqual(["ranked"]);
});

test("an empty Leaderboard lists nobody", async () => {
  const { read } = await createLeaderboard();

  expect(await (await read()).json()).toEqual({ players: [], own: null });
});

test("at equal Rank the higher MMR comes first, and equal Standings keep one order from read to read", async () => {
  const { addPlayer, read } = await createLeaderboard();
  await addPlayer("lowerMmr", { mmr: 1300, duelsPlayed: 20, rank: gold(40) });
  await addPlayer("higherMmr", { mmr: 1450, duelsPlayed: 20, rank: gold(40) });
  for (const nickname of ["twinA", "twinB", "twinC", "twinD"])
    await addPlayer(nickname, { mmr: 1350, duelsPlayed: 20, rank: gold(40) });

  const first = await nicknamesOf(await read());
  const second = await nicknamesOf(await read());

  expect(first[0]).toBe("higherMmr");
  expect(first.at(-1)).toBe("lowerMmr");
  expect(second).toEqual(first);
});

test("at most 100 Players are listed, and no MMR is in the list", async () => {
  const { addPlayer, read } = await createLeaderboard();
  for (let lp = 0; lp <= 100; lp += 1)
    await addPlayer(`lp${lp}`, { mmr: 1777, duelsPlayed: 30, rank: gold(lp) });

  const body = await (await read()).text();
  const { players } = JSON.parse(body) as { players: { position: number; nickname: string }[] };

  expect(players).toHaveLength(100);
  expect(players[0]).toMatchObject({ position: 1, nickname: "lp100" });
  expect(players[99]).toMatchObject({ position: 100, nickname: "lp1" });
  expect(body).not.toContain("1777");
  expect(body.toLowerCase()).not.toContain("mmr");
});

test("a signed-in ranked Player gets their own position, in the top 100 or below it", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  for (let lp = 1; lp <= 100; lp += 1)
    await addPlayer(`lp${lp}`, { mmr: 1500, duelsPlayed: 30, rank: gold(lp) });
  const below = await signInPlayer(auth, { image: "https://cdn.example.com/below.png" });
  await saveStanding(db, below.player.id, {
    mmr: 1500,
    duelsPlayed: 30,
    rank: { tier: "bronze", division: 4, lp: 0 },
  });
  const inTop = await signInPlayer(auth);
  await saveStanding(db, inTop.player.id, { mmr: 1500, duelsPlayed: 30, rank: gold(50) });

  const belowBody = (await (await read(below.cookie)).json()) as {
    players: unknown[];
    own: unknown;
  };
  const inTopBody = (await (await read(inTop.cookie)).json()) as { own: unknown };

  expect(belowBody.players).toHaveLength(100);
  expect(belowBody.own).toEqual({
    position: 102,
    nickname: null,
    avatarUrl: "https://cdn.example.com/below.png",
    rank: { tier: "bronze", division: 4, lp: 0 },
    ornament: { tier: "bronze", division: 4 },
  });
  // 50 Players hold more LP; at equal LP and MMR, the order between the two is the stable last key.
  expect(inTopBody.own).toMatchObject({ rank: gold(50) });
  expect([51, 52]).toContain((inTopBody.own as { position: number }).position);
});

test("each Player wears the Ornament they chose, in the list and in their own place below it", async () => {
  const { auth, db, addPlayer, chooseOrnament, read } = await createLeaderboard();
  await addPlayer("auto", { mmr: 1500, duelsPlayed: 30, rank: gold(90) });
  const pinned = await addPlayer("pinned", { mmr: 1500, duelsPlayed: 30, rank: gold(80) });
  await chooseOrnament(pinned, "silver");
  const bare = await addPlayer("bare", { mmr: 1500, duelsPlayed: 30, rank: gold(70) });
  await chooseOrnament(bare, "none");
  const plate = await addPlayer("plate", { mmr: 1500, duelsPlayed: 30, rank: gold(60) });
  await chooseOrnament(plate, "unranked");
  const silver = (lp: number) => ({ tier: "silver", division: 2, lp }) as const;
  for (let lp = 0; lp < 96; lp += 1)
    await addPlayer(`filler${lp}`, { mmr: 1500, duelsPlayed: 30, rank: silver(lp) });
  const below = await signInPlayer(auth);
  await saveStanding(db, below.player.id, {
    mmr: 1500,
    duelsPlayed: 30,
    rank: { tier: "bronze", division: 2, lp: 0 },
  });
  await chooseOrnament(below.player.id, "bronze");

  const { players, own } = (await (await read(below.cookie)).json()) as {
    players: { nickname: string; ornament: unknown }[];
    own: { position: number; ornament: unknown };
  };

  expect(players.slice(0, 4).map(({ nickname, ornament }) => ({ nickname, ornament }))).toEqual([
    { nickname: "auto", ornament: { tier: "gold", division: 2 } },
    { nickname: "pinned", ornament: { tier: "silver", division: null } },
    { nickname: "bare", ornament: null },
    { nickname: "plate", ornament: { tier: "unranked", division: null } },
  ]);
  expect(own).toMatchObject({ position: 101, ornament: { tier: "bronze", division: null } });
});

test("a Player outside the top 100 among equal Standings gets the position the order gives them", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  const twin = { mmr: 1500, duelsPlayed: 30, rank: gold(10) };
  for (let index = 0; index < 120; index += 1) await addPlayer(`twin${index}`, twin);
  const signedIn = await signInPlayer(auth);
  await saveStanding(db, signedIn.player.id, twin);
  const everyone = await db.execute<{ player_id: string }>(
    sql`select player_id from standing order by player_id`,
  );
  const expected = everyone.findIndex((row) => row.player_id === signedIn.player.id) + 1;

  const { own } = (await (await read(signedIn.cookie)).json()) as { own: { position: number } };

  expect(own.position).toBe(expected);
});

test("a Guest, a Player who never played ranked and a Player in Placement get no position", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  await addPlayer("ranked", { mmr: 1000, duelsPlayed: 5, rank: gold(0) });
  const newcomer = await signInPlayer(auth);
  const inPlacement = await signInPlayer(auth);
  await saveStanding(db, inPlacement.player.id, { mmr: 1200, duelsPlayed: 2, rank: null });

  for (const cookie of [undefined, newcomer.cookie, inPlacement.cookie]) {
    const response = await read(cookie);
    expect(response.status).toBe(200);
    expect(((await response.json()) as { own: unknown }).own).toBeNull();
  }
});

test("the top of the Leaderboard is read from its index, not sorted", async () => {
  const { db } = await createLeaderboard();
  // Enough Players, Unranked ones included, for the planner to weigh an index against a full sort.
  await db.execute(sql`
    insert into "user" (id, name, email, nickname)
    select 'p' || n, 'p' || n, 'p' || n || '@example.com', 'p' || n from generate_series(1, 5000) n`);
  await db.execute(sql`
    insert into standing (player_id, mmr, duels_played, ladder_index, lp)
    select 'p' || n, 1000 + n % 900, 30,
      case when n % 5 = 0 then null else n % 21 end, case when n % 5 = 0 then null else n % 100 end
    from generate_series(1, 5000) n`);
  await db.execute(sql`analyze standing`);

  const plan = await db.execute<{ "QUERY PLAN": string }>(sql`explain ${leaderboardTop(db)}`);
  const lines = plan.map((row) => row["QUERY PLAN"]).join("\n");

  expect(lines).toContain("standing_leaderboard_idx");
  expect(lines).not.toContain("Sort");
});
