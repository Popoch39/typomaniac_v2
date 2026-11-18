import { Link } from "@tanstack/react-router";
import { PlayerBlock } from "./PlayerBlock.tsx";
import { SidebarNav } from "./SidebarNav.tsx";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <Link to="/custom" className="sidebar-title">
        Typomaniac
      </Link>
      <SidebarNav />
      <PlayerBlock />
    </aside>
  );
}
