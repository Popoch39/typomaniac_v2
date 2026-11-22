import { ChooseNicknameNotice } from "../../auth/components/ChooseNicknameNotice.tsx";
import { SignInPrompt } from "../../auth/components/SignInPrompt.tsx";
import { SignedInPlayerChain } from "../../auth/components/SignedInPlayerChain.tsx";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { FriendsContent } from "./FriendsContent.tsx";
import { FriendsGate } from "./FriendsGate.tsx";
import { FriendsSkeleton } from "./FriendsSkeleton.tsx";

const pending = (message: string) => (
  <LoadingState message={message}>
    <FriendsSkeleton />
  </LoadingState>
);

export function FriendsPage() {
  return (
    <Page>
      <PageHeader title="Friends" />
      <SignedInPlayerChain
        guest={
          <SignInPrompt explanation="Friends are for signed-in Players. Sign in to add yours." />
        }
      >
        {(session) => {
          if (session.kind === "checking") return pending("Checking your session…");
          // Friends see each other's Nickname: a Player without one cannot have any yet.
          if (session.kind === "player")
            return (
              <Panel title="Friends" className="max-w-md">
                <ChooseNicknameNotice purpose="add Friends" />
              </Panel>
            );
          return (
            <FriendsGate pending={pending("Reading your Friends…")}>
              {(friends, received, sent) => (
                <FriendsContent friends={friends} received={received} sent={sent} />
              )}
            </FriendsGate>
          );
        }}
      </SignedInPlayerChain>
    </Page>
  );
}
