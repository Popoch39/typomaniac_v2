import { useSyncExternalStore } from "react";

// Tablets get the icon rail; the full sidebar is for wider screens.
const tabletQuery = "(width <= 1024px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(tabletQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useSidebarOpen() {
  return useSyncExternalStore(subscribe, () => !window.matchMedia(tabletQuery).matches);
}
