/** A ray from the centre of the Ornament, as an SVG polygon around (0, 0). */
export type Ray = {
  readonly points: string;
  /** Every other ray is fainter. */
  readonly isFaint: boolean;
};

/** One turn of the Platinum rays, in seconds. */
export const PLATINUM_RAYS_SPIN = 26;

/** The sixteen rays of the Platinum scene, as drawn on the canvas. */
export const PLATINUM_RAYS: readonly Ray[] = [
  { points: "0,0 900,0 886,158", isFaint: false },
  { points: "0,0 831,344 758,485", isFaint: true },
  { points: "0,0 636,636 515,738", isFaint: false },
  { points: "0,0 344,831 193,879", isFaint: true },
  { points: "0,0 0,900 -158,886", isFaint: false },
  { points: "0,0 -344,831 -485,758", isFaint: true },
  { points: "0,0 -636,636 -738,515", isFaint: false },
  { points: "0,0 -831,344 -879,193", isFaint: true },
  { points: "0,0 -900,0 -886,-158", isFaint: false },
  { points: "0,0 -831,-344 -758,-485", isFaint: true },
  { points: "0,0 -636,-636 -515,-738", isFaint: false },
  { points: "0,0 -344,-831 -193,-879", isFaint: true },
  { points: "0,0 0,-900 158,-886", isFaint: false },
  { points: "0,0 344,-831 485,-758", isFaint: true },
  { points: "0,0 636,-636 738,-515", isFaint: false },
  { points: "0,0 831,-344 879,-193", isFaint: true },
];
