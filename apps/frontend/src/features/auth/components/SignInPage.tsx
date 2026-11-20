import { BanNotice } from "../../fair-play/components/BanNotice.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { useSignInRefusal } from "../hooks/useSignInRefusal.ts";
import { SignInPrompt } from "./SignInPrompt.tsx";
import { SignInRefusedMessage } from "./SignInRefusedMessage.tsx";

/** The sign-in screen, where a refused sign-in lands: a banned Player is told so, instead of offered to sign in. */
export function SignInPage() {
  const refusal = useSignInRefusal();

  return (
    <Page>
      <PageHeader
        title="Sign in"
        lead="Sign in to play ranked, climb the Leaderboard and keep your Nickname."
      />
      {refusal?.kind === "banned" ? (
        <BanNotice appealAddress={refusal.appealAddress} />
      ) : (
        <>
          {refusal && <SignInRefusedMessage reason={refusal.reason} />}
          <SignInPrompt explanation="Sign in with your Discord account." />
        </>
      )}
    </Page>
  );
}
