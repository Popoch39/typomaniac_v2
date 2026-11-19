import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "../../../shared/components/ui/sidebar.tsx";
import { PlayerBlock } from "./PlayerBlock.tsx";
import { SidebarDevSignIn } from "./SidebarDevSignIn.tsx";
import { SidebarNav } from "./SidebarNav.tsx";
import { SidebarTitle } from "./SidebarTitle.tsx";

export function ShellSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r-2">
      <SidebarHeader className="px-5 pt-7 pb-0 group-data-[collapsible=icon]:px-5">
        <SidebarTitle />
      </SidebarHeader>
      <SidebarContent className="px-5 pt-8 pb-2">
        <SidebarNav />
      </SidebarContent>
      <SidebarFooter className="gap-3 px-5 pt-2 pb-7">
        <PlayerBlock />
        {import.meta.env.DEV && <SidebarDevSignIn />}
      </SidebarFooter>
    </Sidebar>
  );
}
