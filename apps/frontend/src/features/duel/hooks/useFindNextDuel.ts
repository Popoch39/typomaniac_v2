import { useNavigate } from "@tanstack/react-router";
import { useQueueStore } from "../../queue/store/useQueueStore.ts";

/**
 * Enters the Queue and goes to the Ranked page, whose Queue panel shows the entry, pending or
 * refused, as it does when the Player enters from there.
 */
export function useFindNextDuel() {
  const enter = useQueueStore((state) => state.enter);
  const navigate = useNavigate();
  return () => {
    enter();
    void navigate({ to: "/ranked" });
  };
}
