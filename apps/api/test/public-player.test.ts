import { afterAll, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { getLogger } from "@repo/logger";
import { ladderIndex, type Rank } from "@repo/ranked-engine";
import { createApp } from "../src/app.ts";
import { eq } from "drizzle-orm";
import { duel, duelParticipant, user } from "../src/db/schema.ts";
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

const readPlayer = (nickname: string, cookie?: string) =>
  app.handle(
    new Request(`http://localhost/api/players/${encodeURIComponent(nickname)}`, {
      headers: cookie ? { cookie } : {},
    }),
  );

// A Player with a Nickname of their own, chosen as a Player does.
const playerNamed = async (nickname: string, { image }: { image?: string } = {}) => {
  const { player, cookie } = await signInPlayer(auth, { image });
  const response = await app.handle(
    new Request("http://localhost/api/me/nickname", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ nickname }),
    }),
  );
  expect(response.status).toBe(200);
  return { player, cookie };
};

// A ranked Duel the Player finished on this Rank.
const saveRankedDuelOf = async (playerId: string, after: Rank) => {
  const duelId = crypto.randomUUID();
  await testDb.db.insert(duel).values({
    id: duelId,
    kind: "ranked",
    config: DUEL_GAME_CONFIG,
    startedAt: new Date(),
    endedAt: new Date(),
  });
  await testDb.db.insert(duelParticipant).values({
    duelId,
    seat: 0,
    playerId,
    outcome: "win",
    duelsPlayedBefore: 10,
    ladderIndexAfter: ladderIndex(after),
    lpAfter: after.lp,
  });
};

const uniqueNickname = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

test("anyone without a session reads a ranked Player's Nickname, Avatar, Ornament, Rank and Peak Tier", async () => {
  const nickname = uniqueNickname("Ranked");
  const { player } = await playerNamed(nickname, { image: "https://cdn.example.com/a.png" });
  await saveRankedDuelOf(player.id, { tier: "gold", division: 4, lp: 30 });
  await saveStanding(testDb.db, player.id, {
    mmr: 1337,
    duelsPlayed: 20,
    rank: { tier: "silver", division: 1, lp: 80 },
  });

  const response = await readPlayer(nickname);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    nickname,
    avatarUrl: "https://cdn.example.com/a.png",
    ornament: { tier: "silver", division: 1 },
    rank: { tier: "silver", division: 1, lp: 80 },
    peakTier: "gold",
  });
});

test("an Unranked Player reads as Unranked, with the Unranked Ornament and no Peak Tier", async () => {
  const nickname = uniqueNickname("Newcomer");
  await playerNamed(nickname);

  const response = await readPlayer(nickname);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    nickname,
    avatarUrl: null,
    ornament: { tier: "unranked", division: null },
    rank: null,
    peakTier: null,
  });
});

test("the Nickname is looked up whatever its case", async () => {
  const nickname = uniqueNickname("MiXeD");
  await playerNamed(nickname);

  const response = await readPlayer(nickname.toUpperCase());

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ nickname });
});

test("an unknown Nickname answers 404 with its own code", async () => {
  const response = await readPlayer(uniqueNickname("Nobody"));

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "PLAYER_NOT_FOUND" });
});

test("a Player's page follows their new Nickname, and their former one is no longer found", async () => {
  const former = uniqueNickname("Former");
  const { cookie } = await playerNamed(former);
  const current = uniqueNickname("Current");
  await app.handle(
    new Request("http://localhost/api/me/nickname", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ nickname: current }),
    }),
  );

  expect((await readPlayer(former)).status).toBe(404);
  expect(await (await readPlayer(current)).json()).toMatchObject({ nickname: current });
});

test("a Player without a Nickname is never found", async () => {
  const { player } = await signInPlayer(auth);
  // Better Auth's own name for them is not a Nickname: they have none until they choose one.
  await testDb.db.update(user).set({ name: "nameless" }).where(eq(user.id, player.id));

  const response = await readPlayer("nameless");

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "PLAYER_NOT_FOUND" });
});

test("a signed-in Player reads another Player's page", async () => {
  const nickname = uniqueNickname("Other");
  await playerNamed(nickname);
  const reader = await signInPlayer(auth);

  const response = await readPlayer(nickname, reader.cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ nickname });
});

test("the MMR is not in a Player's page", async () => {
  const nickname = uniqueNickname("Hidden");
  const { player } = await playerNamed(nickname);
  await saveStanding(testDb.db, player.id, {
    mmr: 1987,
    duelsPlayed: 20,
    rank: { tier: "diamond", division: 4, lp: 5 },
  });

  const response = await readPlayer(nickname);

  // Exactly these keys and values: no MMR, nor anything else of the Standing.
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    nickname,
    avatarUrl: null,
    ornament: { tier: "diamond", division: 4 },
    rank: { tier: "diamond", division: 4, lp: 5 },
    peakTier: null,
  });
});

test("a Player reading pages beyond the progress limit is refused with 429 and told when to retry", async () => {
  const limitedRedis = await createTestRedis();
  try {
    const limited = createApp(testDb.db, auth, limitedRedis.redis, getLogger("api"), {
      rateLimit: { limits: { publicReadPerRequester: { max: 2, windowSeconds: 60 } } },
    });
    const nickname = uniqueNickname("Busy");
    await playerNamed(nickname);
    const reader = await signInPlayer(auth);
    const read = (cookie: string) =>
      limited.handle(
        new Request(`http://localhost/api/players/${nickname}`, { headers: { cookie } }),
      );

    expect((await read(reader.cookie)).status).toBe(200);
    expect((await read(reader.cookie)).status).toBe(200);
    const refused = await read(reader.cookie);
    expect(refused.status).toBe(429);
    expect(await refused.json()).toEqual({ code: "RATE_LIMITED" });
    expect(Number(refused.headers.get("retry-after"))).toBeGreaterThan(0);
    // Counted per Player: another reader still gets through.
    expect((await read((await signInPlayer(auth)).cookie)).status).toBe(200);
  } finally {
    await limitedRedis.drop();
  }
});
