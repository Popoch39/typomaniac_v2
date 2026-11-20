import { useSearch } from "@tanstack/react-router";

/** The Review the URL opens next to the queue, if any. */
export function useSelectedReviewId() {
  return useSearch({ from: "/_shell/admin" }).review;
}
