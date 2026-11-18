export type MatchmakingConfig = {
  /** MMR gap accepted for a Player who just entered the Queue. */
  initialWindow: number;
  /** MMR added to the window at each interval waited. */
  windowStep: number;
  /** Waiting time, in milliseconds, that widens the window by one step. */
  windowStepIntervalMs: number;
};

export const DEFAULT_MATCHMAKING_CONFIG: MatchmakingConfig = {
  initialWindow: 100,
  windowStep: 50,
  windowStepIntervalMs: 5000,
};
