import { afterAll, expect, test } from "bun:test";
import type { OrnamentChoice, Standing } from "@repo/ranked-engine";
import { createApp } from "../src/app.ts";
import { user } from "../src/db/schema.ts";
import { eq, sql } from "drizzle-orm";
import { leaderboardSlice, saveStanding } from "../src/modules/standing/service.ts";
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
  const read = (cookie?: string, page?: string) =>
    app.handle(
      new Request(`http://localhost/api/leaderboard${page === undefined ? "" : `?page=${page}`}`, {
        headers: cookie ? { cookie } : {},
      }),
    );
  return { db: testDb.db, auth, addPlayer, chooseOrnament, read };
};

test("a Guest reads the Podium and the first page by Tier, Division and LP, with their Nickname, Avatar and Rank", async () => {
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
    podium: [
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
    ],
    players: [
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
    page: 1,
    pageCount: 1,
    total: 5,
    own: null,
    around: null,
  });
});

const gold = (lp: number) => ({ tier: "gold", division: 2, lp }) as const;

type Listed = { position: number; nickname: string | null } & Record<string, unknown>;
type Body = {
  podium: Listed[];
  players: Listed[];
  page: number;
  pageCount: number;
  total: number;
  own: Listed | null;
  around: Listed[] | null;
};

const bodyOf = async (response: Response) => {
  expect(response.status).toBe(200);
  return (await response.json()) as Body;
};

const nicknamesOf = (players: Listed[]) => players.map(({ nickname }) => nickname);

const positionsOf = (players: Listed[]) => players.map(({ position }) => position);

// `count` Players in one Division, the first one holding the most LP, named by their Position.
const addRankedPlayers = async (
  addPlayer: (nickname: string, standing: Standing) => Promise<string>,
  count: number,
) => {
  for (let position = 1; position <= count; position += 1)
    await addPlayer(`p${position}`, { mmr: 1500, duelsPlayed: 30, rank: gold(count - position) });
};

test("an empty Leaderboard has no Podium and one empty page", async () => {
  const { read } = await createLeaderboard();

  expect(await bodyOf(await read())).toEqual({
    podium: [],
    players: [],
    page: 1,
    pageCount: 1,
    total: 0,
    own: null,
    around: null,
  });
});

test("the Podium holds the first three Positions, fewer while fewer Players are ranked", async () => {
  const { addPlayer, read } = await createLeaderboard();
  const seen: { podium: (string | null)[]; players: (string | null)[]; pageCount: number }[] = [];
  for (let count = 1; count <= 4; count += 1) {
    await addPlayer(`p${count}`, { mmr: 1500, duelsPlayed: 30, rank: gold(100 - count) });
    const { podium, players, pageCount } = await bodyOf(await read());
    seen.push({ podium: nicknamesOf(podium), players: nicknamesOf(players), pageCount });
  }

  expect(seen).toEqual([
    { podium: ["p1"], players: [], pageCount: 1 },
    { podium: ["p1", "p2"], players: [], pageCount: 1 },
    { podium: ["p1", "p2", "p3"], players: [], pageCount: 1 },
    { podium: ["p1", "p2", "p3"], players: ["p4"], pageCount: 1 },
  ]);
});

test("each page lists 15 Players from Position 4 on, under the same Podium", async () => {
  const { addPlayer, read } = await createLeaderboard();
  await addRankedPlayers(addPlayer, 34);

  const first = await bodyOf(await read(undefined, "1"));
  const second = await bodyOf(await read(undefined, "2"));
  const last = await bodyOf(await read(undefined, "3"));

  for (const body of [first, second, last]) {
    expect(nicknamesOf(body.podium)).toEqual(["p1", "p2", "p3"]);
    expect(body).toMatchObject({ pageCount: 3, total: 34 });
  }
  expect(first.page).toBe(1);
  expect(positionsOf(first.players)).toEqual([
    4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  ]);
  expect(nicknamesOf(first.players)[0]).toBe("p4");
  expect(second.page).toBe(2);
  expect(positionsOf(second.players)).toEqual([
    19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
  ]);
  expect(nicknamesOf(second.players).at(-1)).toBe("p33");
  expect(last.page).toBe(3);
  expect(last.players).toEqual([expect.objectContaining({ position: 34, nickname: "p34" })]);
});

test("a page past the last one is served as the last page", async () => {
  const { addPlayer, read } = await createLeaderboard();
  await addRankedPlayers(addPlayer, 20);

  const body = await bodyOf(await read(undefined, "9"));

  expect(body).toMatchObject({ page: 2, pageCount: 2, total: 20 });
  expect(positionsOf(body.players)).toEqual([19, 20]);
});

test("with three ranked Players or fewer, any page is the one empty page", async () => {
  const { addPlayer, read } = await createLeaderboard();
  await addRankedPlayers(addPlayer, 3);

  expect(await bodyOf(await read(undefined, "4"))).toMatchObject({
    players: [],
    page: 1,
    pageCount: 1,
    total: 3,
  });
});

test("a page that is not an integer, or is below 1, is rejected", async () => {
  const { addPlayer, read } = await createLeaderboard();
  await addRankedPlayers(addPlayer, 5);

  for (const page of ["0", "-1", "1.5", "two", ""])
    expect((await read(undefined, page)).status).toBe(422);
});

test("Unranked Players, in Placement or new, are not listed nor counted", async () => {
  const { addPlayer, read } = await createLeaderboard();
  await addPlayer("inPlacement", { mmr: 1900, duelsPlayed: 4, rank: null });
  await addPlayer("ranked", { mmr: 1000, duelsPlayed: 5, rank: gold(0) });

  const body = await bodyOf(await read());

  expect(nicknamesOf(body.podium)).toEqual(["ranked"]);
  expect(body.players).toEqual([]);
  expect(body.total).toBe(1);
});

test("at equal Rank the higher MMR comes first, and equal Standings keep one order from read to read", async () => {
  const { addPlayer, read } = await createLeaderboard();
  await addPlayer("lowerMmr", { mmr: 1300, duelsPlayed: 20, rank: gold(40) });
  await addPlayer("higherMmr", { mmr: 1450, duelsPlayed: 20, rank: gold(40) });
  for (const nickname of ["twinA", "twinB", "twinC", "twinD", "twinE", "twinF"])
    await addPlayer(nickname, { mmr: 1350, duelsPlayed: 20, rank: gold(40) });

  const everyone = async () => {
    const { podium, players } = await bodyOf(await read());
    return nicknamesOf([...podium, ...players]);
  };
  const first = await everyone();
  const second = await everyone();

  expect(first[0]).toBe("higherMmr");
  expect(first.at(-1)).toBe("lowerMmr");
  expect(second).toEqual(first);
});

test("no MMR and no Player id are in the Leaderboard", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  const ids: string[] = [];
  for (let lp = 0; lp < 20; lp += 1)
    ids.push(await addPlayer(`lp${lp}`, { mmr: 1777, duelsPlayed: 30, rank: gold(lp) }));
  const signedIn = await signInPlayer(auth);
  // Last, off the first page: their neighbours are in the response too.
  await saveStanding(db, signedIn.player.id, {
    mmr: 1777,
    duelsPlayed: 30,
    rank: { tier: "bronze", division: 4, lp: 0 },
  });

  const body = await (await read(signedIn.cookie)).text();

  expect(body).toContain('"around":[');
  expect(body).not.toContain("1777");
  expect(body.toLowerCase()).not.toContain("mmr");
  for (const id of [...ids, signedIn.player.id]) expect(body).not.toContain(id);
});

test("a signed-in ranked Player gets their own position, on the Podium, on the page or elsewhere", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  await addRankedPlayers(addPlayer, 40);
  const signInAt = async (lp: number) => {
    const signedIn = await signInPlayer(auth, { image: "https://cdn.example.com/own.png" });
    // Half an LP above nobody: one more than the Player it should stand just ahead of.
    await saveStanding(db, signedIn.player.id, { mmr: 1600, duelsPlayed: 30, rank: gold(lp) });
    return signedIn.cookie;
  };
  // Each one is just ahead of the Player at the same LP, thanks to a higher MMR: p1 holds 39 LP,
  // p10 30 LP and p30 10 LP.
  const onPodium = await signInAt(39);
  const onPage = await signInAt(30);
  const elsewhere = await signInAt(10);

  const podiumBody = await bodyOf(await read(onPodium));
  const pageBody = await bodyOf(await read(onPage));
  const elsewhereBody = await bodyOf(await read(elsewhere));

  expect(podiumBody.own).toMatchObject({ position: 1, rank: gold(39) });
  expect(podiumBody.podium[0]).toEqual(podiumBody.own as Listed);
  // Behind p1 to p9 and the Player on the Podium.
  expect(pageBody.own).toMatchObject({ position: 11, rank: gold(30) });
  expect(pageBody.players).toContainEqual(pageBody.own as Listed);
  // Behind p1 to p29 and the two Players signed in above: on page 2, off the page served.
  expect(elsewhereBody.own).toEqual({
    position: 32,
    nickname: null,
    avatarUrl: "https://cdn.example.com/own.png",
    rank: gold(10),
    ornament: { tier: "gold", division: 2 },
  });
});

test("each Player wears the Ornament they chose, on the Podium, on the page and in their own Position", async () => {
  const { auth, db, addPlayer, chooseOrnament, read } = await createLeaderboard();
  await addPlayer("auto", { mmr: 1500, duelsPlayed: 30, rank: gold(90) });
  const pinned = await addPlayer("pinned", { mmr: 1500, duelsPlayed: 30, rank: gold(80) });
  await chooseOrnament(pinned, "silver");
  const bare = await addPlayer("bare", { mmr: 1500, duelsPlayed: 30, rank: gold(70) });
  await chooseOrnament(bare, "none");
  const plate = await addPlayer("plate", { mmr: 1500, duelsPlayed: 30, rank: gold(60) });
  await chooseOrnament(plate, "unranked");
  const silver = (lp: number) => ({ tier: "silver", division: 2, lp }) as const;
  for (let lp = 0; lp < 20; lp += 1)
    await addPlayer(`filler${lp}`, { mmr: 1500, duelsPlayed: 30, rank: silver(lp) });
  const below = await signInPlayer(auth);
  await saveStanding(db, below.player.id, {
    mmr: 1500,
    duelsPlayed: 30,
    rank: { tier: "bronze", division: 2, lp: 0 },
  });
  await chooseOrnament(below.player.id, "bronze");

  const { podium, players, own } = await bodyOf(await read(below.cookie));

  expect(
    [...podium, ...players.slice(0, 1)].map(({ nickname, ornament }) => ({ nickname, ornament })),
  ).toEqual([
    { nickname: "auto", ornament: { tier: "gold", division: 2 } },
    { nickname: "pinned", ornament: { tier: "silver", division: null } },
    { nickname: "bare", ornament: null },
    { nickname: "plate", ornament: { tier: "unranked", division: null } },
  ]);
  expect(own).toMatchObject({ position: 25, ornament: { tier: "bronze", division: null } });
});

test("a Player off the page among equal Standings gets the position the order gives them", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  const twin = { mmr: 1500, duelsPlayed: 30, rank: gold(10) };
  for (let index = 0; index < 40; index += 1) await addPlayer(`twin${index}`, twin);
  const signedIn = await signInPlayer(auth);
  await saveStanding(db, signedIn.player.id, twin);
  const everyone = await db.execute<{ player_id: string }>(
    sql`select player_id from standing order by player_id`,
  );
  const expected = everyone.findIndex((row) => row.player_id === signedIn.player.id) + 1;

  const pages = await Promise.all(
    ["1", "2", "3"].map(async (page) => bodyOf(await read(signedIn.cookie, page))),
  );

  for (const { own } of pages) expect(own?.position).toBe(expected);
});

test("a Guest, a Player who never played ranked and a Player in Placement get no position", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  await addPlayer("ranked", { mmr: 1000, duelsPlayed: 5, rank: gold(0) });
  const newcomer = await signInPlayer(auth);
  const inPlacement = await signInPlayer(auth);
  await saveStanding(db, inPlacement.player.id, { mmr: 1200, duelsPlayed: 2, rank: null });

  for (const cookie of [undefined, newcomer.cookie, inPlacement.cookie])
    expect((await bodyOf(await read(cookie))).own).toBeNull();
});

test("a ranked Player off the Podium and off the page is shown between the Players just ahead and behind", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  await addRankedPlayers(addPlayer, 40);
  const signedIn = await signInPlayer(auth, { image: "https://cdn.example.com/own.png" });
  // Ahead of p30, who holds as many LP with a lower MMR, and behind p29.
  await saveStanding(db, signedIn.player.id, { mmr: 1600, duelsPlayed: 30, rank: gold(10) });

  const { around } = await bodyOf(await read(signedIn.cookie, "1"));

  expect(around).toEqual([
    {
      position: 29,
      nickname: "p29",
      avatarUrl: null,
      rank: gold(11),
      ornament: { tier: "gold", division: 2 },
    },
    {
      position: 30,
      nickname: null,
      avatarUrl: "https://cdn.example.com/own.png",
      rank: gold(10),
      ornament: { tier: "gold", division: 2 },
    },
    {
      position: 31,
      nickname: "p30",
      avatarUrl: null,
      rank: gold(10),
      ornament: { tier: "gold", division: 2 },
    },
  ]);
});

test("the Player in the last Position is shown after the Player just ahead, with nobody behind", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  await addRankedPlayers(addPlayer, 20);
  const signedIn = await signInPlayer(auth);
  await saveStanding(db, signedIn.player.id, {
    mmr: 1500,
    duelsPlayed: 30,
    rank: { tier: "bronze", division: 4, lp: 0 },
  });

  const { around } = await bodyOf(await read(signedIn.cookie, "1"));

  expect(around?.map(({ position, nickname }) => ({ position, nickname }))).toEqual([
    { position: 20, nickname: "p20" },
    { position: 21, nickname: null },
  ]);
});

test("nobody is shown around a Guest, an Unranked Player, a Player on the Podium or a Player on the page", async () => {
  const { auth, db, addPlayer, read } = await createLeaderboard();
  await addRankedPlayers(addPlayer, 40);
  const signInAt = async (rank: Standing["rank"]) => {
    const signedIn = await signInPlayer(auth);
    await saveStanding(db, signedIn.player.id, { mmr: 1600, duelsPlayed: 30, rank });
    return signedIn.cookie;
  };
  const unranked = await signInAt(null);
  const onPodium = await signInAt(gold(39));
  const onPage = await signInAt(gold(30));
  // On page 2, which is the page served.
  const onServedPage = await signInAt(gold(10));

  for (const [cookie, page] of [
    [undefined, "1"],
    [unranked, "1"],
    [onPodium, "1"],
    [onPage, "1"],
    [onServedPage, "2"],
  ] as const)
    expect((await bodyOf(await read(cookie, page))).around).toBeNull();
});

test("a page of the Leaderboard is read from its index, not sorted", async () => {
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

  for (const [offset, limit] of [
    [0, 3],
    [48, 15],
  ] as const) {
    const plan = await db.execute<{ "QUERY PLAN": string }>(
      sql`explain ${leaderboardSlice(db, offset, limit)}`,
    );
    const lines = plan.map((row) => row["QUERY PLAN"]).join("\n");

    expect(lines).toContain("standing_leaderboard_idx");
    expect(lines).not.toContain("Sort");
  }
});
