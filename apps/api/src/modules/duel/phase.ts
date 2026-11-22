import { DUEL_GAME_CONFIG, END_GRACE_MS, type FinishedRound, type Seat } from "@repo/duel-engine";
import type { Duel, DuelEnd } from "./service.ts";

const SEATS: readonly Seat[] = [0, 1];

/** From the Start of a Round to the instant the server closes the Games still open. */
export const CLOSE_AFTER_MS = DUEL_GAME_CONFIG.seconds * 1000 + END_GRACE_MS;

/**
 * Where a Round stands, decoded once from its hash. A Game has started on the server once its
 * start is anchored, or once it has ended, which the closing of a silent Game does without an anchor.
 */
export type RoundPhase =
  /** Its Start is not fixed yet: only the first Round of a Duel, until its Countdown. */
  | { readonly kind: "awaitingStart" }
  /** Its Start was fixed when the Round before it ended, its Countdown not announced yet. */
  | { readonly kind: "scheduled"; readonly startAt: number }
  /** Its Countdown was announced, no Game has started. */
  | { readonly kind: "countdown"; readonly startAt: number }
  | {
      readonly kind: "running";
      readonly startAt: number;
      /** The server instant the `start` of each seat's Game is anchored at, `null` until then. */
      readonly anchors: readonly (number | null)[];
      /** Whether each seat's Game has ended. */
      readonly gamesEnded: readonly boolean[];
    }
  | {
      readonly kind: "ended";
      readonly startAt: number;
      /** Both Results, both Multipliers and both Outcomes of the Round and the instant it ended. */
      readonly end: FinishedRound & { readonly endedAt: number };
    };

/** Where a Duel stands, decoded once from its hash and its current Round. */
export type DuelPhase =
  /** Its first Round is waiting for its Start. */
  | { readonly kind: "open" }
  | { readonly kind: "playing" }
  /** Its Rounds have decided it, its finalisation has not recorded its end yet. */
  | { readonly kind: "decided" }
  | { readonly kind: "finalised"; readonly end: DuelEnd };

/** The phase of a Round from the fields of its hash. */
export const decodeRoundPhase = (fields: Record<string, string>): RoundPhase => {
  if (fields.startAt === undefined) {
    if (fields.end !== undefined) throw new Error("A Round has ended without a Start");
    return { kind: "awaitingStart" };
  }
  const startAt = Number(fields.startAt);
  if (fields.end !== undefined)
    return {
      kind: "ended",
      startAt,
      end: JSON.parse(fields.end) as FinishedRound & { endedAt: number },
    };
  if (fields.announced !== "1") return { kind: "scheduled", startAt };
  const anchors = SEATS.map((seat) => {
    const anchor = fields[`anchor${seat}`];
    return anchor === undefined ? null : Number(anchor);
  });
  const gamesEnded = SEATS.map((seat) => fields[`ended${seat}`] === "1");
  if (anchors.every((anchor) => anchor === null) && !gamesEnded.some((ended) => ended))
    return { kind: "countdown", startAt };
  return { kind: "running", startAt, anchors, gamesEnded };
};

/** The phase of a Duel from the fields of its hash and the phase of its current Round. */
export const decodeDuelPhase = (fields: Record<string, string>, round: RoundPhase): DuelPhase => {
  if (fields.end !== undefined)
    return { kind: "finalised", end: JSON.parse(fields.end) as DuelEnd };
  if (fields.decided === "1") return { kind: "decided" };
  return round.kind === "awaitingStart" ? { kind: "open" } : { kind: "playing" };
};

/** The Start of a Round, `null` until it is fixed. */
export const startOf = (round: RoundPhase) =>
  round.kind === "awaitingStart" ? null : round.startAt;

/** Whether the Participants hold the Target words of a Round: only once its Countdown is announced. */
export const isAnnounced = (round: RoundPhase) =>
  round.kind === "countdown" || round.kind === "running" || round.kind === "ended";

/** What the sweep does to a due Duel. */
export type Step =
  /** Announces the Countdown of `round` with `startAt`, at once when `forced`. */
  | {
      readonly kind: "announce";
      readonly round: number;
      readonly startAt: number;
      readonly forced: boolean;
    }
  /** Closes the Games of `round` still open, which ends the Round. */
  | { readonly kind: "close"; readonly round: number }
  | { readonly kind: "finalise" }
  /** Takes the Duel off the due Duels: it expired, or was finalised by an instance that stopped before. */
  | { readonly kind: "forget" };

/**
 * The step a due Duel takes at `now`, `null` when nothing is due yet; `duel` is `null` once it
 * expired. Each step is an atomic write that does nothing more when run again.
 */
export const nextStep = (
  duel: Pick<Duel, "kind" | "phase" | "round"> | null,
  now: number,
  countdownMs: number,
): Step | null => {
  if (duel === null || duel.phase.kind === "finalised") return { kind: "forget" };
  if (duel.phase.kind === "decided") return { kind: "finalise" };
  const { number, phase } = duel.round;
  switch (phase.kind) {
    // A Custom Duel is due only once it has expired; a ranked one once its Players had the time to
    // connect, when its Countdown begins whoever is there.
    case "awaitingStart":
      return duel.kind === "ranked"
        ? { kind: "announce", round: number, startAt: now + countdownMs, forced: true }
        : null;
    case "scheduled":
      if (now < phase.startAt - countdownMs) return null;
      // Swept late, the Countdown still lasts in full.
      return {
        kind: "announce",
        round: number,
        startAt: Math.max(now + countdownMs, phase.startAt),
        forced: false,
      };
    case "countdown":
    case "running":
      return now >= phase.startAt + CLOSE_AFTER_MS ? { kind: "close", round: number } : null;
    // Only when its finalisation failed so far: a Round ends with the Duel decided or the next Round.
    case "ended":
      return { kind: "finalise" };
  }
};
