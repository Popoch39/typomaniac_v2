import { afterAll, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG, type Outcome, type Seat } from "@repo/duel-engine";
import { getLogger } from "@repo/logger";
import type { RankChange } from "@repo/ranked-engine";
import type { GameEvent, Result } from "@repo/typing-engine";
import { createApp } from "../src/app.ts";
import { duel, duelGame, duelParticipant, duelRound } from "../src/db/client.ts";
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

const readProgress = (nickname: string, query: Record<string, string> = {}) =>
  app.handle(
    new Request(
      `http://localhost/api/players/${encodeURIComponent(nickname)}/progress?${new URLSearchParams(query).toString()}`,
    ),
  );

const wpmsOf = async (response: Response) => {
  expect(response.status).toBe(200);
  const { games } = (await response.json()) as { games: { wpm: number }[] };
  return games.map(({ wpm }) => wpm);
};

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

// The Rank a ranked Duel ended with, as the ladder stores it.
type RankAfter = { ladderIndex: number; lp: number; rankChange: RankChange };

const OPPOSITE_OUTCOMES: Readonly<Record<Outcome, Outcome>> = {
  win: "loss",
  loss: "win",
  draw: "draw",
};

/**
 * A finished Duel the Player sat in seat `seat`, one Game per entry of `games`, ended at `endedAt`,
 * with `outcome` as its Duel Outcome for the Player and `roundOutcomes` as their Round Outcomes (each
 * Round the Duel's Outcome when left out). The other seat is a Guest whose Games must never show in
 * the Player's Progress. A ranked Duel without `rank` is one of the Player's Placement, which ended
 * without a Rank.
 */
const saveDuel = async (
  playerId: string,
  {
    kind,
    endedAt,
    games,
    seat = 0,
    outcome = "win",
    roundOutcomes = games.map(() => outcome),
    rank,
  }: {
    kind: "ranked" | "custom";
    endedAt: Date;
    games: Measures[];
    seat?: Seat;
    outcome?: Outcome;
    roundOutcomes?: Outcome[];
    rank?: RankAfter;
  },
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
      outcome,
      ...(kind === "ranked"
        ? { mmrBefore: 1987, mmrAfter: 2011, duelsPlayedBefore: 12, duelsPlayedAfter: 13 }
        : {}),
      ...(rank
        ? {
            ladderIndexAfter: rank.ladderIndex,
            lpAfter: rank.lp,
            lpDelta: 20,
            rankChange: rank.rankChange,
          }
        : {}),
    },
    { duelId, seat: opponentSeat, playerId: null, outcome: OPPOSITE_OUTCOMES[outcome] },
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
        outcome: roundOutcomes[index] ?? outcome,
      },
      {
        duelId,
        round: index + 1,
        seat: opponentSeat,
        result: resultOf(OPPONENT_MEASURES),
        journal: [],
        outcome: OPPOSITE_OUTCOMES[roundOutcomes[index] ?? outcome],
      },
    ]),
  );
};

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 1, 12, minutes));

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// Relative to the real clock, as the 30 days run back from the moment of the read.
const ago = (days: number, minutes = 0) =>
  new Date(Date.now() - days * DAY_MS - minutes * MINUTE_MS);

// Duel n of a test plays its only Game at n WPM, so that each Game names its Duel.
const gameAt = (n: number) => [{ wpm: n, rawWpm: n, accuracy: 90, consistency: 80 }];

// The Rank a ranked Duel ends with: `ladderIndex` Divisions above Bronze IV, and `lp` LP.
const rankAt = (ladderIndex: number, lp: number, rankChange: RankChange = "none") => ({
  ladderIndex,
  lp,
  rankChange,
});

const rankPointsOf = async (response: Response) => {
  expect(response.status).toBe(200);
  const { rankPoints } = (await response.json()) as { rankPoints: unknown[] };
  return rankPoints;
};

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
    summary: { won: 2, lost: 0, drawn: 0 },
    // Its ranked Duel was one of its Placement.
    rankPoints: [],
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

test("the last 20 Duels window is the one read by default", async () => {
  const nickname = uniqueNickname("Default");
  const { player } = await playerNamed(nickname);
  for (let n = 1; n <= 21; n += 1)
    await saveDuel(player.id, { kind: "custom", endedAt: at(n), games: gameAt(n) });

  const lastTwenty = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  expect(await wpmsOf(await readProgress(nickname, { window: "20-duels" }))).toEqual(lastTwenty);
  expect(await wpmsOf(await readProgress(nickname))).toEqual(lastTwenty);
});

test("the last 30 days window reads every Duel ended within 30 days, however many, and no older one", async () => {
  const nickname = uniqueNickname("Monthly");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, { kind: "ranked", endedAt: ago(30, 1), games: gameAt(1) });
  await saveDuel(player.id, { kind: "ranked", endedAt: ago(30, -1), games: gameAt(2) });
  // More than 20 Duels in the window: the 30 days are not cut to 20 Duels.
  for (let n = 3; n <= 23; n += 1)
    await saveDuel(player.id, { kind: "custom", endedAt: ago(0, 60 - n), games: gameAt(n) });

  expect(await wpmsOf(await readProgress(nickname, { window: "30-days" }))).toEqual([
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
  ]);
});

test("the all window reads every Duel the Player ever played", async () => {
  const nickname = uniqueNickname("Lifelong");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, { kind: "ranked", endedAt: ago(400), games: gameAt(1) });
  for (let n = 2; n <= 22; n += 1)
    await saveDuel(player.id, { kind: "custom", endedAt: ago(0, 60 - n), games: gameAt(n) });

  expect(await wpmsOf(await readProgress(nickname, { window: "all" }))).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  ]);
});

test("the kind filter keeps only ranked or only Custom Duels, before the last 20 are taken", async () => {
  const nickname = uniqueNickname("Mixed");
  const { player } = await playerNamed(nickname);
  // 21 ranked Duels, then 5 Custom Duels after them.
  for (let n = 1; n <= 26; n += 1)
    await saveDuel(player.id, {
      kind: n <= 21 ? "ranked" : "custom",
      endedAt: at(n),
      games: gameAt(n),
    });

  expect(await wpmsOf(await readProgress(nickname, { kind: "ranked" }))).toEqual([
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  ]);
  expect(await wpmsOf(await readProgress(nickname, { kind: "custom" }))).toEqual([
    22, 23, 24, 25, 26,
  ]);
  const everyKind = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
  expect(await wpmsOf(await readProgress(nickname, { kind: "all" }))).toEqual(everyKind);
  expect(await wpmsOf(await readProgress(nickname))).toEqual(everyKind);
});

test("the kind filter applies within the window", async () => {
  const nickname = uniqueNickname("Recent");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, { kind: "ranked", endedAt: ago(31), games: gameAt(1) });
  await saveDuel(player.id, { kind: "ranked", endedAt: ago(2), games: gameAt(2) });
  await saveDuel(player.id, { kind: "custom", endedAt: ago(1), games: gameAt(3) });

  expect(await wpmsOf(await readProgress(nickname, { window: "30-days", kind: "ranked" }))).toEqual(
    [2],
  );
  expect(await wpmsOf(await readProgress(nickname, { window: "all", kind: "ranked" }))).toEqual([
    1, 2,
  ]);
});

test("a window or a kind that is not one of the choices is rejected", async () => {
  const nickname = uniqueNickname("Strict");
  await playerNamed(nickname);

  const invalidQueries: Record<string, string>[] = [
    { window: "week" },
    { window: "20" },
    { window: "" },
    { kind: "practice" },
    { kind: "Ranked" },
    { kind: "" },
  ];
  for (const query of invalidQueries)
    expect((await readProgress(nickname, query)).status).toBe(422);
});

test("a Player who has not played a Duel has no Game", async () => {
  const nickname = uniqueNickname("Fresh");
  await playerNamed(nickname);

  const response = await readProgress(nickname);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    games: [],
    summary: { won: 0, lost: 0, drawn: 0 },
    rankPoints: [],
  });
});

test("neither the journal nor the MMR is in the Progress, its Rank points included", async () => {
  const nickname = uniqueNickname("Secret");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(5),
    games: [{ wpm: 70, rawWpm: 72, accuracy: 95, consistency: 80 }],
    rank: rankAt(4, 40, "placed"),
  });

  const response = await readProgress(nickname);

  // Exactly these keys and values: no journal, no MMR, nothing else of the Duel.
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    games: [
      {
        endedAt: at(5).getTime(),
        kind: "ranked",
        wpm: 70,
        rawWpm: 72,
        accuracy: 95,
        consistency: 80,
      },
    ],
    summary: { won: 1, lost: 0, drawn: 0 },
    rankPoints: [{ endedAt: at(5).getTime(), ladderIndex: 4, lp: 40, rankChange: "placed" }],
  });
});

test("the Nickname is looked up whatever its case", async () => {
  const nickname = uniqueNickname("MiXeD");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, { kind: "custom", endedAt: at(5), games: gameAt(64) });

  expect(await wpmsOf(await readProgress(nickname.toUpperCase()))).toEqual([64]);
});

test("an unknown Nickname answers 404 with its own code", async () => {
  const response = await readProgress(uniqueNickname("Nobody"));

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "PLAYER_NOT_FOUND" });
});

test("a Player reading Progress beyond their public read limit is refused with 429 and told when to retry", async () => {
  const limitedRedis = await createTestRedis();
  try {
    const limited = createApp(testDb.db, auth, limitedRedis.redis, getLogger("api"), {
      rateLimit: { limits: { publicReadPerRequester: { max: 2, windowSeconds: 60 } } },
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

const summaryOf = async (response: Response) => {
  expect(response.status).toBe(200);
  const { summary } = (await response.json()) as { summary: unknown };
  return summary;
};

// Three Games a Duel of three Rounds.
const threeGames = (n: number) => [...gameAt(n), ...gameAt(n), ...gameAt(n)];

test("the summary counts each Duel once by its Duel Outcome, whatever its Rounds' Outcomes", async () => {
  const nickname = uniqueNickname("Record");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(1),
    games: threeGames(1),
    outcome: "win",
    roundOutcomes: ["win", "loss", "win"],
  });
  await saveDuel(player.id, {
    kind: "custom",
    endedAt: at(2),
    games: threeGames(2),
    outcome: "loss",
    roundOutcomes: ["win", "loss", "loss"],
  });

  expect(await summaryOf(await readProgress(nickname))).toEqual({ won: 1, lost: 1, drawn: 0 });
});

test("a drawn Duel counts as drawn, neither won nor lost", async () => {
  const nickname = uniqueNickname("Even");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, {
    kind: "custom",
    endedAt: at(1),
    games: [...gameAt(1), ...gameAt(1)],
    outcome: "draw",
    roundOutcomes: ["win", "loss"],
  });
  await saveDuel(player.id, { kind: "custom", endedAt: at(2), games: gameAt(2), outcome: "win" });

  expect(await summaryOf(await readProgress(nickname))).toEqual({ won: 1, lost: 0, drawn: 1 });
});

test("the summary counts only the Duels the window selects", async () => {
  const nickname = uniqueNickname("Tally");
  const { player } = await playerNamed(nickname);
  // Two lost Duels, older than 30 days, then 20 won and one drawn within them.
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: ago(40),
    games: gameAt(1),
    outcome: "loss",
  });
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: ago(31),
    games: gameAt(2),
    outcome: "loss",
  });
  await saveDuel(player.id, { kind: "custom", endedAt: ago(5), games: gameAt(3), outcome: "draw" });
  for (let n = 4; n <= 23; n += 1)
    await saveDuel(player.id, { kind: "ranked", endedAt: ago(0, 60 - n), games: gameAt(n) });

  expect(await summaryOf(await readProgress(nickname))).toEqual({ won: 20, lost: 0, drawn: 0 });
  expect(await summaryOf(await readProgress(nickname, { window: "30-days" }))).toEqual({
    won: 20,
    lost: 0,
    drawn: 1,
  });
  expect(await summaryOf(await readProgress(nickname, { window: "all" }))).toEqual({
    won: 20,
    lost: 2,
    drawn: 1,
  });
});

test("the summary counts only the Duels of the kind the filter keeps", async () => {
  const nickname = uniqueNickname("Sorted");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, { kind: "ranked", endedAt: at(1), games: gameAt(1), outcome: "win" });
  await saveDuel(player.id, { kind: "ranked", endedAt: at(2), games: gameAt(2), outcome: "loss" });
  await saveDuel(player.id, { kind: "custom", endedAt: at(3), games: gameAt(3), outcome: "draw" });
  await saveDuel(player.id, { kind: "custom", endedAt: at(4), games: gameAt(4), outcome: "loss" });

  expect(await summaryOf(await readProgress(nickname, { kind: "ranked" }))).toEqual({
    won: 1,
    lost: 1,
    drawn: 0,
  });
  expect(await summaryOf(await readProgress(nickname, { kind: "custom" }))).toEqual({
    won: 0,
    lost: 1,
    drawn: 1,
  });
  expect(await summaryOf(await readProgress(nickname, { kind: "all" }))).toEqual({
    won: 1,
    lost: 2,
    drawn: 1,
  });
});

test("the Rank points are the ranked Duels that ended with a Rank, oldest first, from the end of Placement, with each Promotion and demotion", async () => {
  const nickname = uniqueNickname("Climber");
  const { player } = await playerNamed(nickname);
  // Placement: no Rank until its last Duel places the Player.
  await saveDuel(player.id, { kind: "ranked", endedAt: at(1), games: gameAt(1) });
  await saveDuel(player.id, { kind: "ranked", endedAt: at(2), games: gameAt(2) });
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(3),
    games: gameAt(3),
    rank: rankAt(6, 0, "placed"),
  });
  await saveDuel(player.id, { kind: "custom", endedAt: at(4), games: gameAt(4) });
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(6),
    games: gameAt(6),
    rank: rankAt(7, 5, "promoted"),
  });
  // Saved out of order: the Rank points follow the Duels' ends.
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(5),
    games: gameAt(5),
    rank: rankAt(6, 85),
  });
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(7),
    games: gameAt(7),
    rank: rankAt(6, 75, "demoted"),
  });

  expect(await rankPointsOf(await readProgress(nickname))).toEqual([
    { endedAt: at(3).getTime(), ladderIndex: 6, lp: 0, rankChange: "placed" },
    { endedAt: at(5).getTime(), ladderIndex: 6, lp: 85, rankChange: "none" },
    { endedAt: at(6).getTime(), ladderIndex: 7, lp: 5, rankChange: "promoted" },
    { endedAt: at(7).getTime(), ladderIndex: 6, lp: 75, rankChange: "demoted" },
  ]);
});

test("the kind filter leaves the Rank points as they are: a Custom Duel never gives one", async () => {
  const nickname = uniqueNickname("Steady");
  const { player } = await playerNamed(nickname);
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(1),
    games: gameAt(1),
    rank: rankAt(3, 0, "placed"),
  });
  await saveDuel(player.id, { kind: "custom", endedAt: at(2), games: gameAt(2) });
  await saveDuel(player.id, {
    kind: "ranked",
    endedAt: at(3),
    games: gameAt(3),
    rank: rankAt(3, 22),
  });
  await saveDuel(player.id, { kind: "custom", endedAt: at(4), games: gameAt(4) });

  const rankPoints = [
    { endedAt: at(1).getTime(), ladderIndex: 3, lp: 0, rankChange: "placed" },
    { endedAt: at(3).getTime(), ladderIndex: 3, lp: 22, rankChange: "none" },
  ];
  for (const kind of ["all", "ranked", "custom"])
    expect(await rankPointsOf(await readProgress(nickname, { kind }))).toEqual(rankPoints);
});

test("the Rank points follow the window: the last 20 ranked Duels, those of the last 30 days, or all", async () => {
  const nickname = uniqueNickname("Ladder");
  const { player } = await playerNamed(nickname);
  // Ranked Duel n ends with n LP; the first four ended over 30 days ago.
  for (let n = 1; n <= 26; n += 1)
    await saveDuel(player.id, {
      kind: "ranked",
      endedAt: n <= 4 ? ago(40, -n) : ago(0, 60 - n),
      games: gameAt(n),
      rank: rankAt(2, n),
    });
  // Custom Duels after them do not push ranked Duels out of the last 20.
  for (let n = 27; n <= 29; n += 1)
    await saveDuel(player.id, { kind: "custom", endedAt: ago(0, 60 - n), games: gameAt(n) });

  const lpsOf = async (window: string) =>
    ((await rankPointsOf(await readProgress(nickname, { window }))) as { lp: number }[]).map(
      ({ lp }) => lp,
    );
  // Every LP from `first` to the last ranked Duel's, 26.
  const from = (first: number) => Array.from({ length: 27 - first }, (_, index) => first + index);
  expect(await lpsOf("20-duels")).toEqual(from(7));
  expect(await lpsOf("30-days")).toEqual(from(5));
  expect(await lpsOf("all")).toEqual(from(1));
});
