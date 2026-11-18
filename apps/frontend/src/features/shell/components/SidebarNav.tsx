import { Swords, Trophy, User } from "lucide-react";
import { SidebarGroup, SidebarMenu } from "../../../shared/components/ui/sidebar.tsx";
import { SidebarNavLink } from "./SidebarNavLink.tsx";

export function SidebarNav() {
  return (
    <SidebarGroup>
      <nav aria-label="Sections">
        <SidebarMenu className="gap-1">
          <SidebarNavLink to="/ranked" icon={Trophy} label="Ranked" />
          <SidebarNavLink to="/custom" icon={Swords} label="Custom" />
          <SidebarNavLink to="/profile" icon={User} label="Profile" />
        </SidebarMenu>
      </nav>
    </SidebarGroup>
  );
}
