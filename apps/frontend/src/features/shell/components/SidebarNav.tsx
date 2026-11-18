import { Swords, Trophy, User } from "lucide-react";
import { SidebarNavLink } from "./SidebarNavLink.tsx";

export function SidebarNav() {
  return (
    <nav className="sidebar-nav" aria-label="Sections">
      <ul>
        <li>
          <SidebarNavLink to="/ranked" icon={Trophy} label="Ranked" />
        </li>
        <li>
          <SidebarNavLink to="/custom" icon={Swords} label="Custom" />
        </li>
        <li>
          <SidebarNavLink to="/profile" icon={User} label="Profile" />
        </li>
      </ul>
    </nav>
  );
}
