import type { Ray } from "./platinumRays.ts";

/** One turn of the Master rays, faster than Platinum's, in seconds. */
export const MASTER_RAYS_SPIN = 14;

/** The twenty rays of the Master scene, as drawn on the canvas; the faint ones take the action colour. */
export const MASTER_RAYS: readonly Ray[] = [
  { points: "0,0 900,0 891,127", isFaint: false },
  { points: "0,0 856,278 808,396", isFaint: true },
  { points: "0,0 728,529 646,626", isFaint: false },
  { points: "0,0 529,728 421,795", isFaint: true },
  { points: "0,0 278,856 155,887", isFaint: false },
  { points: "0,0 0,900 -127,891", isFaint: true },
  { points: "0,0 -278,856 -396,808", isFaint: false },
  { points: "0,0 -529,728 -626,646", isFaint: true },
  { points: "0,0 -728,529 -795,421", isFaint: false },
  { points: "0,0 -856,278 -887,155", isFaint: true },
  { points: "0,0 -900,0 -891,-127", isFaint: false },
  { points: "0,0 -856,-278 -808,-396", isFaint: true },
  { points: "0,0 -728,-529 -646,-626", isFaint: false },
  { points: "0,0 -529,-728 -421,-795", isFaint: true },
  { points: "0,0 -278,-856 -155,-887", isFaint: false },
  { points: "0,0 0,-900 127,-891", isFaint: true },
  { points: "0,0 278,-856 396,-808", isFaint: false },
  { points: "0,0 529,-728 626,-646", isFaint: true },
  { points: "0,0 728,-529 795,-421", isFaint: false },
  { points: "0,0 856,-278 887,-155", isFaint: true },
];
