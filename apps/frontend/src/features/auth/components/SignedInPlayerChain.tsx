import type { ReactNode } from "react";
import type { ChainedSession } from "../session/sessionOf.ts";
import { SignedInPlayerGate } from "./SignedInPlayerGate.tsx";

interface SignedInPlayerChainProps {
  guest: ReactNode;
  /** The gate chained after the session, given a session still being checked until it is known. */
  children: (session: ChainedSession) => ReactNode;
}

/**
 * A signed-in page whose content waits on a read of the Player. The chained gate stands in the same
 * place from the start, waiting on a session still being checked: React keeps its skeleton mounted
 * through both waits, so they look like one and the loading pixels never restart.
 */
export function SignedInPlayerChain({ guest, children }: SignedInPlayerChainProps) {
  return (
    <SignedInPlayerGate pending={children({ kind: "checking" })} guest={guest}>
      {children}
    </SignedInPlayerGate>
  );
}
