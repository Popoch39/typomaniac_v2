import type { ReactNode } from "react";
import { SidebarMenu, SidebarMenuItem } from "../../../shared/components/ui/sidebar.tsx";

interface PlayerBlockLayoutProps {
  /** The PlayerChip, or what stands in its box. */
  chip: ReactNode;
  /** One sidebar key under the chip, such as "Sign out". */
  action: ReactNode;
}

// Every state of the Player block is a chip over one key, so that they all take the same room.
export function PlayerBlockLayout({ chip, action }: PlayerBlockLayoutProps) {
  return (
    <SidebarMenu className="gap-2">
      <SidebarMenuItem>{chip}</SidebarMenuItem>
      <SidebarMenuItem>{action}</SidebarMenuItem>
    </SidebarMenu>
  );
}
