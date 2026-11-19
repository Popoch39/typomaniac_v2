import { useSyncExternalStore } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the Player asks the system for reduced motion, kept up to date as they change it. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(reducedMotionQuery).matches);
}
