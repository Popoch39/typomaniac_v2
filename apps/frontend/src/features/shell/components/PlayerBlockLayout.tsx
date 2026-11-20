import type { ReactNode } from "react";
import { DangerStatusLine } from "../../../shared/components/DangerStatusLine.tsx";
import { SidebarMenu, SidebarMenuItem } from "../../../shared/components/ui/sidebar.tsx";

interface PlayerBlockLayoutProps {
  /** The PlayerChip, or what stands in its box. */
  chip: ReactNode;
  /** One sidebar key under the chip, such as "Sign out". */
  action: ReactNode;
  /** Why the key's action failed, such as a sign out; null while nothing failed. */
  failure: string | null;
}

// Every state of the Player block is a chip over one key and the key's error line, reserved even
// without an error, so that they all take the same room and an error never grows the block upward.
export function PlayerBlockLayout({ chip, action, failure }: PlayerBlockLayoutProps) {
  return (
    <SidebarMenu className="gap-2">
      <SidebarMenuItem>{chip}</SidebarMenuItem>
      <SidebarMenuItem>{action}</SidebarMenuItem>
      <SidebarMenuItem>
        <DangerStatusLine message={failure} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
