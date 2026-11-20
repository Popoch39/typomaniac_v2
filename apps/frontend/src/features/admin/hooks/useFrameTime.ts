import { useSyncExternalStore } from "react";

let frameTime = 0;

function subscribeToFrames(onFrame: () => void) {
  let id = requestAnimationFrame(function step(time) {
    frameTime = time;
    onFrame();
    id = requestAnimationFrame(step);
  });
  return () => cancelAnimationFrame(id);
}

const subscribeToNothing = () => () => {};

/**
 * The instant of the last animation frame, on the clock of `performance.now()`, renewed at every frame
 * while `isRunning`, so that nothing is drawn again while a replay is paused.
 */
export function useFrameTime(isRunning: boolean) {
  return useSyncExternalStore(isRunning ? subscribeToFrames : subscribeToNothing, () => frameTime);
}
