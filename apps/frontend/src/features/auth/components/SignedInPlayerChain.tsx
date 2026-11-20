import type { ReactNode } from "react";
import type { SignedInPlayer } from "../hooks/useSignedInPlayer.ts";
import { SignedInPlayerGate } from "./SignedInPlayerGate.tsx";

interface SignedInPlayerChainProps {
  guest: ReactNode;
  /** The gate chained after the session, given no Player while the session is checked. */
  children: (player: SignedInPlayer | null) => ReactNode;
}

/**
 * A signed-in page whose content waits on a read of the Player. The chained gate stands in the same
 * place from the start, waiting without a Player while the session is checked: React keeps its
 * skeleton mounted through both waits, so they look like one and the loading pixels never restart.
 */
export function SignedInPlayerChain({ guest, children }: SignedInPlayerChainProps) {
  return (
    <SignedInPlayerGate pending={children(null)} guest={guest}>
      {children}
    </SignedInPlayerGate>
  );
}
