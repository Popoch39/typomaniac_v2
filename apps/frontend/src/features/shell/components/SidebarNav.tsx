import { SidebarGroup, SidebarMenu } from "../../../shared/components/ui/sidebar.tsx";
import { AdminNavLink } from "./AdminNavLink.tsx";
import { CustomIcon } from "./CustomIcon.tsx";
import { LeaderboardIcon } from "./LeaderboardIcon.tsx";
import { PracticeIcon } from "./PracticeIcon.tsx";
import { ProfileIcon } from "./ProfileIcon.tsx";
import { RankedIcon } from "./RankedIcon.tsx";
import { SidebarNavLink } from "./SidebarNavLink.tsx";

export function SidebarNav() {
  return (
    <SidebarGroup className="p-0">
      <nav aria-label="Sections">
        <SidebarMenu className="gap-1.5">
          <SidebarNavLink to="/ranked" icon={<RankedIcon />} label="Ranked" />
          <SidebarNavLink to="/leaderboard" icon={<LeaderboardIcon />} label="Leaderboard" />
          <SidebarNavLink to="/custom" icon={<CustomIcon />} label="Custom" />
          <SidebarNavLink to="/practice" icon={<PracticeIcon />} label="Practice" />
          <SidebarNavLink to="/profile" icon={<ProfileIcon />} label="Profile" />
          <AdminNavLink />
        </SidebarMenu>
      </nav>
    </SidebarGroup>
  );
}
