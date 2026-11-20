import { afterAll, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG, type Seat } from "@repo/duel-engine";
import { getLogger } from "@repo/logger";
import type { GameEvent, Result } from "@repo/typing-engine";
import { createApp } from "../src/app.ts";
import { duel, duelGame, duelParticipant, duelRound } from "../src/db/schema.ts";
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

const readProgress = (nickname: string, cookie?: string) =>
  app.handle(
    new Request(`http://localhost/api/players/${encodeURIComponent(nickname)}/progress`, {
      headers: cookie ? { cookie } : {},
    }),
  );

const uniqueNickname = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

// A Player with a Nickname of their own, chosen as a Player does.
const playerNamed = async (nickname: string) => {
  const { player, cookie } = await signInPlayer(auth);
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

type Measures = Pick<Result, "wpm" | "rawWpm" | "accuracy" | "consistency">;

// A whole Result as the server saves it: only its four measures belong in the Progress.
const resultOf = (measures: Measures): Result => ({
  ...measures,
  duration: 30,
  charCounts: { correct: 150, incorrect: 3, extra: 1, missed: 2, exactWords: 140 },
  history: { wpm: [55, 60], keystrokeRate: [58, 61], errors: [0, 1] },
  keyPressGaps: [120, 130],
  keyHoldDurations: [80, 90, 85],
  keyConsistency: 77.5,
  inactiveSeconds: 0,
  inactiveAtEnd: false,
});

const JOURNAL: GameEvent[] = [{ type: "keyDown", at: 1, code: "KeyQ" }];

const OPPONENT_MEASURES: Measures = { wpm: 1, rawWpm: 2, accuracy: 3, consistency: 4 };

/**
 * A finished Duel the Player sat in seat `seat`, one Game per entry of `games`, ended at `endedAt`.
 * The other seat is a Guest whose Games must never show in the Player's Progress.
 */
const saveDuel = async (
  playerId: string,
  {
    kind,
    endedAt,
    games,
    seat = 0,
  }: { kind: "ranked" | "custom"; endedAt: Date; games: Measures[]; seat?: Seat },
) => {
  const duelId = crypto.randomUUID();
  const opponentSeat: Seat = seat === 0 ? 1 : 0;
  await testDb.db.insert(duel).values({
    id: duelId,
    kind,
    config: DUEL_GAME_CONFIG,
    startedAt: new Date(endedAt.getTime() - 120_000),
    endedAt,
  });
  await testDb.db.insert(duelParticipant).values([
    {
      duelId,
      seat,
      playerId,
      outcome: "win",
      ...(kind === "ranked"
        ? { mmrBefore: 1987, mmrAfter: 2011, duelsPlayedBefore: 12, duelsPlayedAfter: 13 }
        : {}),
    },
    { duelId, seat: opponentSeat, playerId: null, outcome: "loss" },
  ]);
  await testDb.db.insert(duelRound).values(
    games.map((_, index) => ({
      duelId,
      round: index + 1,
      words: ["alpha", "beta"],
      startedAt: endedAt,
      endedAt,
    })),
  );
  await testDb.db.insert(duelGame).values(
    games.flatMap((measures, index) => [
      {
        duelId,
        round: index + 1,
        seat,
        result: resultOf(measures),
        journal: JOURNAL,
        outcome: "win" as const,
      },
      {
        duelId,
        round: index + 1,
        seat: opponentSeat,
        result: resultOf(OPPONENT_MEASURES),
        journal: [],
        outcome: "loss" as const,
      },
    ]),
  );
};

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 1, 12, minutes));

test("anyone without a session reads a Player's Games, oldest first, with their Duel's end and kind and the four measures", async () => {
  const nickname = uniqueNickname("Typist");
  const { player } = await playerNamed(nickname);
  // Saved out of order: the Progress follows the Duels' ends, then the Rounds.
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(30),
    seat: 1,
    games: [{ wpm: 72.5, rawWpm: 75, accuracy: 96.4, consistency: 81.2 }],
  });
  await saveDuel(player.id, {
    kind: "custom",
    endedAt: at(10),
    games: [
      { wpm: 60, rawWpm: 64.25, accuracy: 93.1, consistency: 70 },
      { wpm: 61.5, rawWpm: 63, accuracy: 97.75, consistency: 74.5 },
    ],
  });

  const response = await readProgress(nickname.toUpperCase());

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    games: [
      {
        endedAt: at(10).getTime(),
        kind: "custom",
        wpm: 60,
        rawWpm: 64.25,
        accuracy: 93.1,
        consistency: 70,
      },
      {
        endedAt: at(10).getTime(),
        kind: "custom",
        wpm: 61.5,
        rawWpm: 63,
        accuracy: 97.75,
        consistency: 74.5,
      },
      {
        endedAt: at(30).getTime(),
        kind: "ranked",
        wpm: 72.5,
        rawWpm: 75,
        accuracy: 96.4,
        consistency: 81.2,
      },
    ],
  });
});

test("only the Games of the Player's last 20 Duels are read", async () => {
  const nickname = uniqueNickname("Veteran");
  const { player } = await playerNamed(nickname);
  // Duel n is played at minute n, at n WPM, so that each Game names its Duel.
  for (let n = 1; n <= 22; n += 1)
    await saveDuel(player.id, {
      kind: n % 2 === 0 ? "ranked" : "custom",
      endedAt: at(n),
      games: [{ wpm: n, rawWpm: n, accuracy: 90, consistency: 80 }],
    });

  const response = await readProgress(nickname);

  expect(response.status).toBe(200);
  const { games } = (await response.json()) as { games: { wpm: number }[] };
  expect(games.map(({ wpm }) => wpm)).toEqual([
    3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  ]);
});

test("a Player who has not played a Duel has no Game", async () => {
  const nickname = uniqueNickname("Fresh");
  await playerNamed(nickname);

  const response = await readProgress(nickname);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ games: [] });
});

test("neither the journal nor the MMR is in the Progress", async () => {
  const nickname = uniqueNickname("Secret");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(5),
    games: [{ wpm: 70, rawWpm: 72, accuracy: 95, consistency: 80 }],
  });

  const body = await (await readProgress(nickname)).text();

  expect(body.toLowerCase()).not.toContain("journal");
  expect(body).not.toContain("KeyQ");
  expect(body.toLowerCase()).not.toContain("mmr");
  expect(body).not.toContain("1987");
  expect(body).not.toContain("2011");
});

test("an unknown Nickname answers 404 with its own code", async () => {
  const response = await readProgress(uniqueNickname("Nobody"));

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "PLAYER_NOT_FOUND" });
});

test("a Player reading Progress beyond the progress limit is refused with 429 and told when to retry", async () => {
  const limitedRedis = await createTestRedis();
  try {
    const limited = createApp(testDb.db, auth, limitedRedis.redis, getLogger("api"), {
      rateLimit: { limits: { progress: { max: 2, windowSeconds: 60 } } },
    });
    const nickname = uniqueNickname("Busy");
    await playerNamed(nickname);
    const reader = await signInPlayer(auth);
    const read = () =>
      limited.handle(
        new Request(`http://localhost/api/players/${nickname}/progress`, {
          headers: { cookie: reader.cookie },
        }),
      );

    expect((await read()).status).toBe(200);
    expect((await read()).status).toBe(200);
    const refused = await read();
    expect(refused.status).toBe(429);
    expect(await refused.json()).toEqual({ code: "RATE_LIMITED" });
    expect(Number(refused.headers.get("retry-after"))).toBeGreaterThan(0);
  } finally {
    await limitedRedis.drop();
  }
});
