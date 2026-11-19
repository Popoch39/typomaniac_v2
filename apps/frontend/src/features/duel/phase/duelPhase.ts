export type DuelPhase =
  | "connecting"
  | "waiting"
  | "countdown"
  | "running"
  /** Between two Rounds, or after the last one: the Round that just ended is shown. */
  | "roundEnd"
  | "finished"
  | "refused"
  | "disconnected";

/** The phases shown on the Broadcast screen, under its band. */
export type BroadcastPhase = Extract<DuelPhase, "countdown" | "running" | "roundEnd" | "finished">;
