import type { Logger } from "@repo/logger";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { createDuel, duelPlayersChannel, isInUnfinishedDuel } from "../duel/service.ts";
import { readFriendIds, readListedPlayer } from "../friend/service.ts";
import {
  evictFromQueue,
  type PairingChange,
  pairingChannel,
  readPendingPairing,
} from "../queue/service.ts";
import type { RateLimiter } from "../rate-limit/index.ts";
import {
  type Challenge,
  cancelChallenges,
  cancelAllChallengesOf,
  closeChallenge,
  forgetDueChallenge,
  openChallenge,
  type PlayerServerMessage,
  pushToPlayer,
  readChallenge,
  readChallengesOf,
  readDueChallenges,
  onlineWindowNow,
  readPlayerStates,
} from "./service.ts";

/** How often each instance looks for the Challenges that expired. */
export const CHALLENGE_SWEEP_INTERVAL_MS = 250;

/** The tab a Challenge message came from. */
type Tab = {
  readonly playerId: string;
  /** The socket's id. */
  readonly connection: string;
  readonly send: (message: PlayerServerMessage) => void;
};

/**
 * Challenges between Friends, sent, answered and withdrawn from their Player sockets. A Challenge
 * lives in Redis only, so that any instance answers it; every message about it goes through the
 * Players' channels, but those meant for the one tab that sent the message.
 */
export const createChallenges = (
  db: Db,
  redis: Redis,
  logger: Logger,
  rateLimiter: RateLimiter,
  {
    expiryMs,
    windowMs,
    duelExpiryMs,
  }: {
    readonly expiryMs: number;
    /** How long a Player stays Online after their sockets, to tell an offline Friend. */
    readonly windowMs: number;
    /** How long the Custom Duel of an accepted Challenge can be joined, as any Custom Duel. */
    readonly duelExpiryMs: number;
  },
) => {
  let sweeper: ReturnType<typeof setInterval> | null = null;
  let sweep: Promise<void> | null = null;
  let following: Promise<unknown> | null = null;

  const isOnline = async (playerId: string) =>
    (await readPlayerStates(redis, [playerId], onlineWindowNow(windowMs))).get(playerId) !==
    "offline";

  // A Player in a Pairing awaiting acceptance is about to enter a ranked Duel.
  const isBusy = async (playerId: string) =>
    (await isInUnfinishedDuel(redis, playerId)) ||
    (await readPendingPairing(redis, playerId)) !== null;

  const refusal = async (tab: Tab, targetId: string) => {
    if (await rateLimiter.isOver("challenge", tab.playerId)) return "RATE_LIMITED";
    if (!(await readFriendIds(db, tab.playerId)).includes(targetId)) return "NOT_FRIENDS";
    if (await isInUnfinishedDuel(redis, tab.playerId)) return "IN_DUEL";
    if (!(await isOnline(targetId))) return "FRIEND_OFFLINE";
    if (await isBusy(targetId)) return "FRIEND_BUSY";
    return null;
  };

  // A Player who enters a Duel or a Pairing can no longer be taken into a Challenge's Custom Duel.
  const cancelChallengesOf = async (playerId: string, { ifIn }: { ifIn: "duel" | "pairing" }) => {
    const challenges = await readChallengesOf(redis, playerId);
    if (challenges.length === 0) return;
    // Announced when their Duel ends too, which leaves their Challenges alone.
    if (ifIn === "duel" && !(await isInUnfinishedDuel(redis, playerId))) return;
    await cancelChallenges(redis, challenges);
  };
  const cancelLogged = (playerIds: readonly string[], ifIn: "duel" | "pairing") =>
    void Promise.all(playerIds.map((playerId) => cancelChallengesOf(playerId, { ifIn }))).catch(
      (error: unknown) =>
        logger.error("Could not cancel the Challenges of Players {playerIds}", {
          playerIds,
          error,
        }),
    );
  // Every instance hears these, and each cancels: closing a Challenge is one step, which only one wins.
  const duelPlayersListener = (raw: string) => cancelLogged(JSON.parse(raw) as string[], "duel");
  const pairingListener = (raw: string) => {
    const change = JSON.parse(raw) as PairingChange;
    if (change.type === "proposed") cancelLogged([change.playerId], "pairing");
  };

  const cancelAllOf = async (playerIds: readonly string[]) => {
    await Promise.all(playerIds.map((playerId) => cancelAllChallengesOf(redis, playerId)));
  };

  // A closed Challenge was closed by exactly one caller, who alone tells both sides.
  const expire = async (challengeId: string) => {
    const challenge = await readChallenge(redis, challengeId);
    if (challenge === null) return forgetDueChallenge(redis, challengeId);
    if (!(await closeChallenge(redis, challenge))) return;
    const message = { type: "challengeExpired", challengeId } as const;
    await Promise.all([
      pushToPlayer(redis, challenge.challengerId, message),
      pushToPlayer(redis, challenge.targetId, message),
    ]);
  };
  const sweepDue = async () => {
    for (const challengeId of await readDueChallenges(redis, Date.now())) await expire(challengeId);
  };
  const runSweep = () => {
    sweep ??= sweepDue()
      .catch((error: unknown) => logger.error("Could not sweep the Challenges", { error }))
      .finally(() => {
        sweep = null;
      });
  };

  // The tab answering is told the outcome itself; the Player's other tabs that it was answered.
  const answer = async (tab: Tab, challengeId: string, at: number) => {
    const challenge = await readChallenge(redis, challengeId);
    const answered =
      challenge !== null &&
      (await closeChallenge(redis, challenge, { targetId: tab.playerId, answeredAt: at }));
    if (!answered) {
      tab.send({ type: "challengeAnsweredElsewhere", challengeId });
      return null;
    }
    await pushToPlayer(
      redis,
      tab.playerId,
      { type: "challengeAnsweredElsewhere", challengeId },
      tab.connection,
    );
    return challenge;
  };

  return {
    challenge: async (tab: Tab, targetId: string) => {
      const refused = await refusal(tab, targetId);
      if (refused !== null) {
        tab.send({ type: "challengeRefused", playerId: targetId, code: refused });
        return;
      }
      const [challenger, opened] = await Promise.all([
        readListedPlayer(db, tab.playerId),
        openChallenge(redis, {
          challengerId: tab.playerId,
          targetId,
          connection: tab.connection,
          now: Date.now(),
          expiryMs,
        }),
      ]);
      if (opened === "pending") {
        tab.send({ type: "challengeRefused", playerId: targetId, code: "CHALLENGE_PENDING" });
        return;
      }
      // A Friend always has a Nickname, unless banned meanwhile.
      if (challenger === null) {
        await cancelChallenges(redis, [opened]);
        return;
      }
      const { challengeId } = opened;
      tab.send({
        type: "challengeSent",
        challengeId,
        playerId: targetId,
        answerWithinMs: expiryMs,
      });
      await pushToPlayer(redis, targetId, {
        type: "challengeReceived",
        challengeId,
        challenger,
        answerWithinMs: expiryMs,
      });
    },
    cancel: async (tab: Tab, challengeId: string) => {
      const challenge = await readChallenge(redis, challengeId);
      if (challenge?.challengerId === tab.playerId) await cancelChallenges(redis, [challenge]);
    },
    accept: async (tab: Tab, challengeId: string) => {
      const challenge = await answer(tab, challengeId, Date.now());
      if (challenge === null) return;
      const duelId = await createDuel(redis, "custom", duelExpiryMs);
      const accepted = { type: "challengeAccepted", challengeId, duelId } as const;
      tab.send(accepted);
      await Promise.all([
        pushToPlayer(redis, challenge.challengerId, accepted),
        evictFromQueue(redis, tab.playerId, "challenged"),
      ]);
    },
    decline: async (tab: Tab, challengeId: string) => {
      const challenge = await answer(tab, challengeId, Date.now());
      if (challenge === null) return;
      await pushToPlayer(redis, challenge.challengerId, {
        type: "challengeDeclined",
        challengeId,
        playerId: tab.playerId,
      });
    },
    /** Cancels the Challenge the closed tab sent, which could no longer take its Player into the Duel. */
    release: async (tab: Pick<Tab, "playerId" | "connection">) => {
      const sent = (await readChallengesOf(redis, tab.playerId)).filter(
        (challenge: Challenge) =>
          challenge.challengerId === tab.playerId && challenge.connection === tab.connection,
      );
      await cancelChallenges(redis, sent);
    },
    /** Cancels the Challenges of those of these Players who went offline. */
    whenChanged: async (playerIds: readonly string[]) => {
      const states = await readPlayerStates(redis, playerIds, onlineWindowNow(windowMs));
      await cancelAllOf(
        [...states].flatMap(([playerId, state]) => (state === "offline" ? [playerId] : [])),
      );
    },
    /** Cancels every Challenge these Players sent or received. */
    cancelAllOf,
    start: () => {
      sweeper ??= setInterval(runSweep, CHALLENGE_SWEEP_INTERVAL_MS);
      following ??= Promise.all([
        redis.subscriber.subscribe(duelPlayersChannel(redis), duelPlayersListener),
        redis.subscriber.subscribe(pairingChannel(redis), pairingListener),
      ]).catch((error: unknown) =>
        logger.error("Could not follow the Players entering a Duel or a Pairing", { error }),
      );
    },
    /** Sweeps and follows no more, and lets the sweep under way finish. */
    stop: async () => {
      if (sweeper !== null) clearInterval(sweeper);
      sweeper = null;
      if (following !== null) {
        following = null;
        // Only these listeners: other modules on the same connection may still follow the channels.
        await Promise.all([
          redis.subscriber.unsubscribe(duelPlayersChannel(redis), duelPlayersListener),
          redis.subscriber.unsubscribe(pairingChannel(redis), pairingListener),
        ]);
      }
      await sweep;
    },
  };
};
