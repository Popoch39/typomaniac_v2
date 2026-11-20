import { useDevSignIn } from "../../auth/hooks/useDevSignIn.ts";

/** Both Dev Players' sign-ins, whose errors share one line. */
export function useSidebarDevSignIn() {
  const alice = useDevSignIn("dev_alice");
  const bob = useDevSignIn("dev_bob");
  return { alice, bob, failure: alice.failure ?? bob.failure };
}
