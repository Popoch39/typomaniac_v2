export type SideKey = {
  readonly letter: string;
  /** The top left corner of the key on the stage, in px. */
  readonly x: number;
  readonly y: number;
  /** When it is pressed and lights up, from the opening of the scene, in seconds. */
  readonly pressAt: number;
  /** When it starts to idle, pressed again every few seconds for as long as the scene stays open. */
  readonly idleAt: number;
};

const LEFT = 80;
const RIGHT = 896;
const TOP = 118;
const PITCH = 110;
const PRESS_AT = 0.15;
const PRESS_STEP = 0.17;
const IDLE_AT = 3.2;
const IDLE_STEP = 0.12;

/** M, A, S down the left of the Ornament and T, E, R down its right, pressed in reading order. */
export const MASTER_SIDE_KEYS: readonly SideKey[] = "MASTER".split("").map((letter, index) => ({
  letter,
  x: index < 3 ? LEFT : RIGHT,
  y: TOP + (index % 3) * PITCH,
  pressAt: Number((PRESS_AT + index * PRESS_STEP).toFixed(2)),
  idleAt: Number((IDLE_AT + index * IDLE_STEP).toFixed(2)),
}));
