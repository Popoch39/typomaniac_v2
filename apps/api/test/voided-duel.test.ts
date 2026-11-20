import { afterAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { DUEL_GAME_CONFIG, type Outcome } from "@repo/duel-engine";
import { getLogger } from "@repo/logger";
import type { Standing } from "@repo/ranked-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { createApp } from "../src/app.ts";
import { sanction, user, voidedDuel, voidedDuelCorrection } from "../src/db/client.ts";
import { saveDuel } from "../src/modules/duel/service.ts";
import { voidDuel } from "../src/modules/fair-play/service.ts";
import { readPeakTier } from "../src/modules/ornament/service.ts";
import { readStanding, saveStanding } from "../src/modules/standing/service.ts";
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
const APPEAL_ADDRESS = "appeal@example.org";
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
  fairPlay: { appealAddress: APPEAL_ADDRESS },
});

const readFairPlay = (cookie?: string) =>
  app.handle(
    new Request("http://localhost/api/me/fair-play", { headers: cookie ? { cookie } : {} }),
  );

const VOIDED_AT = new Date("2026-11-20T12:00:00.000Z");

// Two Players past Placement at Gold III, 50 LP, with an MMR of 1384: a Duel between them moves the
// winner by +16 MMR and +30 LP and the loser by −16 MMR and −17 LP (gaps of 10 and 3 to the Gold III
// reference of 1350).
const even: Standing = { mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } };

const words = ["cat", "dog", "owl"];
const journal: GameEvent[] = [
  { type: "start", at: 0 },
  { type: "tick", at: 30_000 },
];
const result = getResult(journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words)));

// A ranked Duel between two Players, saved with its Outcomes as the API saves one.
const playRankedDuel = async (outcomes: readonly [Outcome, Outcome]) => {
  const [first, second] = [await signInPlayer(auth), await signInPlayer(auth)];
  await saveStanding(testDb.db, first.player.id, even);
  await saveStanding(testDb.db, second.player.id, even);
  const duelId = crypto.randomUUID();
  await saveDuel(testDb.db, duelId, {
    kind: "ranked",
    playerIds: [first.player.id, second.player.id],
    outcomes,
    rounds: [
      {
        number: 1,
        words,
        startAt: Date.now() - 30_000,
        endedAt: Date.now(),
        journals: [journal, journal],
        results: [result, result],
        multipliers: [1, 1],
        outcomes,
      },
    ],
  });
  return { duelId, first, second };
};

test("voiding a Duel the Player at fault won takes from them what they won and gives their Opponent back what they lost, on today's Standings", async () => {
  const { duelId, first: cheater, second: victim } = await playRankedDuel(["win", "loss"]);
  // Both played on after the Duel: the correction applies to the Standings as they are now.
  await saveStanding(testDb.db, cheater.player.id, {
    mmr: 1420,
    duelsPlayed: 45,
    rank: { tier: "gold", division: 2, lp: 10 },
  });
  await saveStanding(testDb.db, victim.player.id, {
    mmr: 1300,
    duelsPlayed: 44,
    rank: { tier: "gold", division: 4, lp: 90 },
  });

  const voided = await voidDuel(testDb.db, {
    duelId,
    playerId: cheater.player.id,
    cause: "review",
    at: VOIDED_AT,
  });

  expect(voided).toBe("voided");
  // 1420 − 16; Gold II 10 LP − 30 = Gold III 80 LP.
  expect(await readStanding(testDb.db, cheater.player.id)).toEqual({
    mmr: 1404,
    duelsPlayed: 45,
    rank: { tier: "gold", division: 3, lp: 80 },
  });
  // 1300 + 16; Gold IV 90 LP + 17 = Gold III 7 LP.
  expect(await readStanding(testDb.db, victim.player.id)).toEqual({
    mmr: 1316,
    duelsPlayed: 44,
    rank: { tier: "gold", division: 3, lp: 7 },
  });
});

test.each([
  ["lost", ["loss", "win"]],
  ["drew", ["draw", "draw"]],
] as const)(
  "voiding a Duel the Player at fault %s changes no Standing and saves no Sanction",
  async (_, outcomes) => {
    const { duelId, first: cheater, second: opponent } = await playRankedDuel(outcomes);
    const standings = [
      await readStanding(testDb.db, cheater.player.id),
      await readStanding(testDb.db, opponent.player.id),
    ];

    const voided = await voidDuel(testDb.db, {
      duelId,
      playerId: cheater.player.id,
      cause: "violation",
      at: VOIDED_AT,
    });

    expect(voided).toBe("not-won");
    expect([
      await readStanding(testDb.db, cheater.player.id),
      await readStanding(testDb.db, opponent.player.id),
    ]).toEqual(standings);
    expect(
      await testDb.db.select().from(sanction).where(eq(sanction.playerId, cheater.player.id)),
    ).toEqual([]);
  },
);

test("voiding the same Duel twice, even at once, corrects the Standings once", async () => {
  const { duelId, first: cheater, second: victim } = await playRankedDuel(["win", "loss"]);
  const voiding = { duelId, playerId: cheater.player.id, cause: "review", at: VOIDED_AT } as const;

  const results = await Promise.all([voidDuel(testDb.db, voiding), voidDuel(testDb.db, voiding)]);
  const again = await voidDuel(testDb.db, voiding);

  expect(results.toSorted()).toEqual(["already-voided", "voided"]);
  expect(again).toBe("already-voided");
  // Back to where both stood before the Duel, and no further.
  expect(await readStanding(testDb.db, cheater.player.id)).toEqual({ ...even, duelsPlayed: 41 });
  expect(await readStanding(testDb.db, victim.player.id)).toEqual({ ...even, duelsPlayed: 41 });
});

test("voiding a Duel leaves the Standing of a Player who took no part in it untouched", async () => {
  const { duelId, first: cheater } = await playRankedDuel(["win", "loss"]);
  const { player: bystander } = await signInPlayer(auth);
  await saveStanding(testDb.db, bystander.id, even);

  await voidDuel(testDb.db, {
    duelId,
    playerId: cheater.player.id,
    cause: "review",
    at: VOIDED_AT,
  });

  expect(await readStanding(testDb.db, bystander.id)).toEqual(even);
});

test("a Duel cannot be voided for a Player who did not play it, nor a Duel that does not exist", async () => {
  const { duelId } = await playRankedDuel(["win", "loss"]);
  const { player: stranger } = await signInPlayer(auth);
  const voiding = { cause: "review", at: VOIDED_AT } as const;

  expect(await voidDuel(testDb.db, { ...voiding, duelId, playerId: stranger.id })).toBe(
    "not-found",
  );
  expect(
    await voidDuel(testDb.db, { ...voiding, duelId: crypto.randomUUID(), playerId: stranger.id }),
  ).toBe("not-found");
});

test("voiding a Duel saves a Sanction of kind Voided Duel with its Player, cause and instant, and the correction applied to each seat", async () => {
  const { duelId, first: victim, second: cheater } = await playRankedDuel(["loss", "win"]);

  await voidDuel(testDb.db, {
    duelId,
    playerId: cheater.player.id,
    cause: "violation",
    at: VOIDED_AT,
  });

  const [saved] = await testDb.db
    .select()
    .from(sanction)
    .where(eq(sanction.playerId, cheater.player.id));
  expect(saved).toMatchObject({
    kind: "voided_duel",
    cause: "violation",
    startedAt: VOIDED_AT,
    endsAt: null,
    revokedAt: null,
  });
  expect(await testDb.db.select().from(voidedDuel).where(eq(voidedDuel.duelId, duelId))).toEqual([
    { duelId, sanctionId: saved?.id ?? "" },
  ]);
  // Gold III 33 LP back to 50 for the victim, Gold III 80 LP back to 50 for the Player at fault.
  expect(
    await testDb.db
      .select()
      .from(voidedDuelCorrection)
      .where(eq(voidedDuelCorrection.duelId, duelId))
      .orderBy(voidedDuelCorrection.seat),
  ).toEqual([
    { duelId, seat: 0, mmr: 16, lp: 17, ladderIndexAfter: 9 },
    { duelId, seat: 1, mmr: -16, lp: -30, ladderIndexAfter: 9 },
  ]);
  expect(await readStanding(testDb.db, victim.player.id)).toEqual({ ...even, duelsPlayed: 41 });
});

test("CORRECT-5: voiding a Duel never lowers the Peak Tier of the Player at fault, and lifts their Opponent's when the LP given back reach a higher Tier", async () => {
  const { duelId, first: cheater, second: victim } = await playRankedDuel(["win", "loss"]);
  await saveStanding(testDb.db, cheater.player.id, {
    mmr: 1300,
    duelsPlayed: 41,
    rank: { tier: "gold", division: 4, lp: 10 },
  });
  await saveStanding(testDb.db, victim.player.id, {
    mmr: 1450,
    duelsPlayed: 41,
    rank: { tier: "gold", division: 1, lp: 95 },
  });

  await voidDuel(testDb.db, {
    duelId,
    playerId: cheater.player.id,
    cause: "review",
    at: VOIDED_AT,
  });

  // Gold IV 10 LP − 30 = Silver I 80 LP, under the Gold reached by the Duel.
  expect(await readStanding(testDb.db, cheater.player.id)).toMatchObject({
    rank: { tier: "silver", division: 1, lp: 80 },
  });
  expect(await readPeakTier(testDb.db, cheater.player.id)).toBe("gold");
  // Gold I 95 LP + 17 = Platinum IV 12 LP, above every Rank a Duel left them at.
  expect(await readPeakTier(testDb.db, victim.player.id)).toBe("platinum");
});

test("a Guest asking for their Voided Duels is told they are not signed in", async () => {
  const response = await readFairPlay();

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
});

test("each Player of a Voided Duel reads it among their own, with the LP it gave back or took, and the Player at fault where to contest it; a Player who took no part reads none", async () => {
  const older = await playRankedDuel(["win", "loss"]);
  const { duelId, first: cheater, second: victim } = older;
  await testDb.db.update(user).set({ nickname: "cheater" }).where(eq(user.id, cheater.player.id));
  await testDb.db.update(user).set({ nickname: "victim" }).where(eq(user.id, victim.player.id));
  await voidDuel(testDb.db, {
    duelId,
    playerId: cheater.player.id,
    cause: "review",
    at: VOIDED_AT,
  });
  const later = await playRankedDuel(["win", "loss"]);
  const laterAt = new Date(VOIDED_AT.getTime() + 60_000);
  await voidDuel(testDb.db, {
    duelId: later.duelId,
    playerId: later.first.player.id,
    cause: "violation",
    at: laterAt,
  });
  const { cookie: bystander } = await signInPlayer(auth);

  const [forVictim, forCheater, forBystander] = await Promise.all([
    readFairPlay(victim.cookie),
    readFairPlay(cheater.cookie),
    readFairPlay(bystander),
  ]);

  expect(forVictim.status).toBe(200);
  expect(await forVictim.json()).toEqual({
    voidedDuels: [
      {
        duelId,
        voidedAt: VOIDED_AT.getTime(),
        opponentNickname: "cheater",
        opponentBanned: false,
        lp: 17,
        appealAddress: null,
      },
    ],
    suspension: null,
  });
  expect(await forCheater.json()).toEqual({
    voidedDuels: [
      {
        duelId,
        voidedAt: VOIDED_AT.getTime(),
        opponentNickname: "victim",
        opponentBanned: false,
        lp: -30,
        appealAddress: APPEAL_ADDRESS,
      },
    ],
    suspension: null,
  });
  expect(await forBystander.json()).toEqual({ voidedDuels: [], suspension: null });
  expect(await (await readFairPlay(later.second.cookie)).json()).toEqual({
    voidedDuels: [
      {
        duelId: later.duelId,
        voidedAt: laterAt.getTime(),
        opponentNickname: null,
        opponentBanned: false,
        lp: 17,
        appealAddress: null,
      },
    ],
    suspension: null,
  });
});
