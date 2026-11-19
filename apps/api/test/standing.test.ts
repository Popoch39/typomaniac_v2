import { afterAll, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG, type Outcome } from "@repo/duel-engine";
import { createApp } from "../src/app.ts";
import { duel, duelParticipant } from "../src/db/schema.ts";
import { saveStanding } from "../src/modules/standing/service.ts";
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

const readStanding = (cookie?: string) =>
  app.handle(
    new Request("http://localhost/api/me/standing", { headers: cookie ? { cookie } : {} }),
  );

test("a Guest asking for their Standing is told they are not signed in", async () => {
  const response = await readStanding();

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
});

test("a Player who never played ranked reads as Unranked with 0 Placement Duels played out of 5", async () => {
  const { cookie } = await signInPlayer(auth);

  const response = await readStanding(cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    rank: null,
    placement: { played: 0, total: 5, outcomes: [] },
  });
});

test("a Player in Placement reads as Unranked with the Placement Duels they played", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, { mmr: 1264, duelsPlayed: 3, rank: null });

  const response = await readStanding(cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    rank: null,
    placement: { played: 3, total: 5, outcomes: [] },
  });
});

// A finished Duel the Player sat in, with the Duels they had played before it when it is ranked.
const saveDuelOf = async (playerId: string, outcome: Outcome, duelsPlayedBefore: number | null) => {
  const duelId = crypto.randomUUID();
  await testDb.db.insert(duel).values({
    id: duelId,
    kind: duelsPlayedBefore === null ? "custom" : "ranked",
    config: DUEL_GAME_CONFIG,
    startedAt: new Date(),
    endedAt: new Date(),
  });
  await testDb.db
    .insert(duelParticipant)
    .values({ duelId, seat: 0, playerId, outcome, duelsPlayedBefore });
};

test("a Player in Placement reads the Outcome of each Placement Duel, in the order they played them", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, { mmr: 1210, duelsPlayed: 3, rank: null });
  await saveDuelOf(player.id, "draw", 2);
  await saveDuelOf(player.id, "win", 0);
  await saveDuelOf(player.id, "loss", null);
  await saveDuelOf(player.id, "loss", 1);

  const response = await readStanding(cookie);

  expect(await response.json()).toEqual({
    rank: null,
    placement: { played: 3, total: 5, outcomes: ["win", "loss", "draw"] },
  });
});

test("a ranked Player reads the Outcomes of their Placement Duels only, not of the ranked Duels after", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, {
    mmr: 1300,
    duelsPlayed: 6,
    rank: { tier: "silver", division: 2, lp: 20 },
  });
  for (const [index, outcome] of (["win", "win", "loss", "win", "draw", "loss"] as const).entries())
    await saveDuelOf(player.id, outcome, index);

  const response = await readStanding(cookie);

  expect(await response.json()).toEqual({
    rank: { tier: "silver", division: 2, lp: 20 },
    placement: { played: 5, total: 5, outcomes: ["win", "win", "loss", "win", "draw"] },
  });
});

test("a ranked Player reads their Tier, Division and LP, with their Placement complete", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, {
    mmr: 1337,
    duelsPlayed: 42,
    rank: { tier: "gold", division: 2, lp: 45 },
  });

  const response = await readStanding(cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    rank: { tier: "gold", division: 2, lp: 45 },
    placement: { played: 5, total: 5, outcomes: [] },
  });
});

test("a Master Player reads their Tier and LP, without a Division", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, {
    mmr: 2105,
    duelsPlayed: 300,
    rank: { tier: "master", lp: 340 },
  });

  const response = await readStanding(cookie);

  expect(await response.json()).toEqual({
    rank: { tier: "master", lp: 340 },
    placement: { played: 5, total: 5, outcomes: [] },
  });
});

test("the MMR is not in the Standing a Player reads", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, {
    mmr: 1987,
    duelsPlayed: 20,
    rank: { tier: "diamond", division: 4, lp: 5 },
  });

  const body = await (await readStanding(cookie)).text();

  expect(body).not.toContain("1987");
  expect(body.toLowerCase()).not.toContain("mmr");
});

test("a Player has one Standing: saving it again replaces it", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, { mmr: 1232, duelsPlayed: 4, rank: null });
  await saveStanding(testDb.db, player.id, {
    mmr: 1264,
    duelsPlayed: 5,
    rank: { tier: "silver", division: 1, lp: 0 },
  });

  const response = await readStanding(cookie);

  expect(await response.json()).toEqual({
    rank: { tier: "silver", division: 1, lp: 0 },
    placement: { played: 5, total: 5, outcomes: [] },
  });
});

test("a Player reads their own Standing, not another Player's", async () => {
  const ranked = await signInPlayer(auth);
  const newcomer = await signInPlayer(auth);
  await saveStanding(testDb.db, ranked.player.id, {
    mmr: 950,
    duelsPlayed: 9,
    rank: { tier: "bronze", division: 3, lp: 12 },
  });

  expect(await (await readStanding(newcomer.cookie)).json()).toEqual({
    rank: null,
    placement: { played: 0, total: 5, outcomes: [] },
  });
  expect(await (await readStanding(ranked.cookie)).json()).toEqual({
    rank: { tier: "bronze", division: 3, lp: 12 },
    placement: { played: 5, total: 5, outcomes: [] },
  });
});
