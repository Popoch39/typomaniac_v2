import { afterAll, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { duel, duelParticipant } from "../src/db/client.ts";
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
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"));

const readOrnament = (cookie?: string) =>
  app.handle(
    new Request("http://localhost/api/me/ornament", { headers: cookie ? { cookie } : {} }),
  );

const chooseOrnament = (choice: unknown, cookie: string) =>
  app.handle(
    new Request("http://localhost/api/me/ornament", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ choice }),
    }),
  );

const readProfile = async (cookie: string) => {
  const response = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie } }),
  );
  return response.json();
};

const signInPlayerWithNickname = async () => {
  const { player, cookie } = await signInPlayer(auth);
  const response = await app.handle(
    new Request("http://localhost/api/me/nickname", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ nickname: `p_${crypto.randomUUID().slice(0, 8)}` }),
    }),
  );
  expect(response.status).toBe(200);
  return { player, cookie };
};

// A ranked Duel the Player finished at this ladder index.
const saveRankedDuelEndingAt = async (playerId: string, ladderIndexAfter: number) => {
  const duelId = crypto.randomUUID();
  await testDb.db.insert(duel).values({
    id: duelId,
    kind: "ranked",
    config: DUEL_GAME_CONFIG,
    startedAt: new Date(),
    endedAt: new Date(),
  });
  await testDb.db
    .insert(duelParticipant)
    .values({ duelId, seat: 0, playerId, outcome: "win", duelsPlayedBefore: 10, ladderIndexAfter });
};

const GOLD_FOUR = 8;
const PLATINUM_FOUR = 12;
const GOLD_ONE = 11;

test("a Guest asking for their Ornament is told they are not signed in", async () => {
  const response = await readOrnament();

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
});

test("a Player without Nickname asking for their Ornament is told to choose one", async () => {
  const { cookie } = await signInPlayer(auth);

  const response = await readOrnament(cookie);

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ code: "NICKNAME_REQUIRED" });
});

test("a new Player reads Auto, no Peak Tier, and the Unranked plate", async () => {
  const { cookie } = await signInPlayerWithNickname();

  const response = await readOrnament(cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    choice: "auto",
    peakTier: null,
    worn: { tier: "unranked", division: null },
  });
});

test("a ranked Player reads the highest Tier they reached as their Peak Tier, not their current one", async () => {
  const { player, cookie } = await signInPlayerWithNickname();
  await saveRankedDuelEndingAt(player.id, GOLD_FOUR);
  await saveRankedDuelEndingAt(player.id, PLATINUM_FOUR);
  await saveRankedDuelEndingAt(player.id, GOLD_ONE);
  await saveStanding(testDb.db, player.id, {
    mmr: 1500,
    duelsPlayed: 13,
    rank: { tier: "gold", division: 1, lp: 60 },
  });

  const response = await readOrnament(cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    choice: "auto",
    peakTier: "platinum",
    worn: { tier: "gold", division: 1 },
  });
});

test("a Player pins the Ornament of a Tier they reached, and wears it without its Division", async () => {
  const { player, cookie } = await signInPlayerWithNickname();
  await saveRankedDuelEndingAt(player.id, GOLD_FOUR);
  await saveStanding(testDb.db, player.id, {
    mmr: 1400,
    duelsPlayed: 10,
    rank: { tier: "gold", division: 4, lp: 10 },
  });

  const response = await chooseOrnament("silver", cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    choice: "silver",
    peakTier: "gold",
    worn: { tier: "silver", division: null },
  });
  expect(await readProfile(cookie)).toMatchObject({ ornament: { tier: "silver", division: null } });
});

test("a Player without a Peak Tier may wear None, the Unranked plate, or Auto again", async () => {
  const { cookie } = await signInPlayerWithNickname();

  const none = await chooseOrnament("none", cookie);
  expect(none.status).toBe(200);
  expect(await readProfile(cookie)).toMatchObject({ ornament: null });

  const unranked = await chooseOrnament("unranked", cookie);
  expect(unranked.status).toBe(200);
  expect(await readProfile(cookie)).toMatchObject({
    ornament: { tier: "unranked", division: null },
  });

  const auto = await chooseOrnament("auto", cookie);
  expect(auto.status).toBe(200);
  expect(await auto.json()).toMatchObject({ choice: "auto" });
});

test("a Player pinning a Tier above their Peak Tier is refused, and keeps their choice", async () => {
  const { player, cookie } = await signInPlayerWithNickname();
  await saveRankedDuelEndingAt(player.id, GOLD_ONE);

  const response = await chooseOrnament("platinum", cookie);

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ code: "ORNAMENT_LOCKED" });
  expect(await (await readOrnament(cookie)).json()).toMatchObject({ choice: "auto" });
});

test("a Player without a Peak Tier cannot pin any Tier", async () => {
  const { cookie } = await signInPlayerWithNickname();

  const response = await chooseOrnament("bronze", cookie);

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ code: "ORNAMENT_LOCKED" });
});

test.each([
  ["an unknown Tier", "emerald"],
  ["a Division", { tier: "gold", division: 2 }],
  ["nothing", null],
])("a Player choosing %s is told the Ornament is invalid", async (_, choice) => {
  const { cookie } = await signInPlayerWithNickname();

  const response = await chooseOrnament(choice, cookie);

  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ code: "ORNAMENT_INVALID" });
});

test("a Guest or a Player without Nickname cannot choose an Ornament", async () => {
  const guest = await app.handle(
    new Request("http://localhost/api/me/ornament", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ choice: "none" }),
    }),
  );
  expect(guest.status).toBe(401);

  const { cookie } = await signInPlayer(auth);
  const withoutNickname = await chooseOrnament("none", cookie);
  expect(withoutNickname.status).toBe(403);
  expect(await withoutNickname.json()).toEqual({ code: "NICKNAME_REQUIRED" });
});

test("after a demotion, the Ornament of the former Tier can still be pinned", async () => {
  const { player, cookie } = await signInPlayerWithNickname();
  // Promoted to Platinum IV, then demoted back to Gold I.
  await saveRankedDuelEndingAt(player.id, PLATINUM_FOUR);
  await saveRankedDuelEndingAt(player.id, GOLD_ONE);
  await saveStanding(testDb.db, player.id, {
    mmr: 1500,
    duelsPlayed: 12,
    rank: { tier: "gold", division: 1, lp: 75 },
  });

  const response = await chooseOrnament("platinum", cookie);

  expect(response.status).toBe(200);
  expect(await readProfile(cookie)).toMatchObject({
    ornament: { tier: "platinum", division: null },
  });
});
