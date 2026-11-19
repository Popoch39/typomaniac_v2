/** When the Platinum grid starts to blink, with the rings and the burst, in seconds. */
const GRID_AT = 1.32;
/** Between two steps out from the Ornament, in seconds. */
const STEP = 0.06;
/** How far apart two steps are, in px. */
const STEP_DISTANCE = 48;
const COLUMNS = 26;
const ROWS = 17;
const PITCH = 40;
const OFFSET = 4;
const SIZE = 32;
// The centre of the Ornament on the stage.
const CENTRE_X = 520;
const CENTRE_Y = 260;

export type GridSquare = {
  /** The top left corner of the square on the stage, in px. */
  readonly x: number;
  readonly y: number;
  /** When it blinks, in seconds from the opening of the scene. */
  readonly delay: number;
};

/**
 * The squares of the Platinum grid, each blinking a step later the farther its centre is from the
 * Ornament, as the canvas staggers them.
 */
export const PLATINUM_GRID: readonly GridSquare[] = Array.from(
  { length: ROWS * COLUMNS },
  (_, index) => {
    const x = OFFSET + (index % COLUMNS) * PITCH;
    const y = OFFSET + Math.floor(index / COLUMNS) * PITCH;
    const distance = Math.hypot(x + SIZE / 2 - CENTRE_X, y + SIZE / 2 - CENTRE_Y);
    return { x, y, delay: GRID_AT + Math.round(distance / STEP_DISTANCE) * STEP };
  },
);
