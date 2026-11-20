import { DangerStatusLine } from "../../../shared/components/DangerStatusLine.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { GuestChip } from "../../shell/components/GuestChip.tsx";
import { PlayerBlockLayout } from "../../shell/components/PlayerBlockLayout.tsx";
import { PlayerChip } from "../../shell/components/PlayerChip.tsx";
import { SidebarSignInButton } from "../../shell/components/SidebarSignInButton.tsx";
import { SidebarSignOutButton } from "../../shell/components/SidebarSignOutButton.tsx";
import { signedInPlayerFixture } from "../fixtures/signedInPlayerFixture.ts";
import { useDevInlineFailure } from "../hooks/useDevInlineFailure.ts";
import { DevSidebarFrame } from "./DevSidebarFrame.tsx";
import { DevStateColumn } from "./DevStateColumn.tsx";

// Each key shows and clears its error in turn. Bottoms aligned, as in the sidebar's footer.
export function DevInlineErrorStates() {
  const createDuel = useDevInlineFailure();
  const signIn = useDevInlineFailure();
  const signOut = useDevInlineFailure();

  return (
    <section aria-label="Inline errors" className="flex flex-col gap-8">
      <h2 className="m-0 type-section-title font-normal text-ink">Inline errors</h2>
      <DevStateColumn label="Under a key">
        <Panel title="Custom Duel" tag="Best of 3" className="max-w-md">
          <div className="flex flex-col items-start gap-3 pb-2">
            <Keycap type="button" variant="brand" size="lg" onClick={createDuel.toggle}>
              Create a Duel
            </Keycap>
            <DangerStatusLine message={createDuel.failure} />
          </div>
        </Panel>
      </DevStateColumn>
      {[false, true].map((isRail) => (
        <DevStateColumn key={String(isRail)} label={isRail ? "Icon rail" : "Expanded"}>
          <div className="flex flex-wrap items-end gap-8">
            <DevSidebarFrame label="Sign in failed" isRail={isRail}>
              <PlayerBlockLayout
                chip={<GuestChip />}
                action={<SidebarSignInButton onSignIn={signIn.toggle} isPending={false} />}
                failure={signIn.failure}
              />
            </DevSidebarFrame>
            <DevSidebarFrame label="Sign out failed" isRail={isRail}>
              <PlayerBlockLayout
                chip={<PlayerChip player={signedInPlayerFixture} />}
                action={<SidebarSignOutButton onSignOut={signOut.toggle} isPending={false} />}
                failure={signOut.failure}
              />
            </DevSidebarFrame>
          </div>
        </DevStateColumn>
      ))}
    </section>
  );
}
