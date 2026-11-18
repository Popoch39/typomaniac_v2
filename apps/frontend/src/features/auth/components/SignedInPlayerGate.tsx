import type { ReactNode } from "react";
import { useSignedInPlayer } from "../hooks/useSignedInPlayer.ts";
import { SignInPrompt } from "./SignInPrompt.tsx";

type SignedInPlayer = NonNullable<ReturnType<typeof useSignedInPlayer>["player"]>;

interface SignedInPlayerGateProps {
  guestExplanation: string;
  children: (player: SignedInPlayer) => ReactNode;
}

/** Shows its content to a signed-in Player only, and invites a Guest to sign in instead. */
export function SignedInPlayerGate({ guestExplanation, children }: SignedInPlayerGateProps) {
  const { player, isPending, failure } = useSignedInPlayer();

  if (isPending) return <p role="status">Checking your session…</p>;
  if (failure) return <p role="alert">{failure}</p>;
  if (player === null) return <SignInPrompt explanation={guestExplanation} />;
  return children(player);
}
