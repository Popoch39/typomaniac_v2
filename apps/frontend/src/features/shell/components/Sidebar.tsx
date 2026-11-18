import { Link } from "@tanstack/react-router";
import { Keyboard } from "lucide-react";
import { PlayerBlock } from "./PlayerBlock.tsx";
import { SidebarNav } from "./SidebarNav.tsx";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <Link to="/custom" className="sidebar-title">
        <Keyboard className="sidebar-title-icon" aria-hidden="true" size={24} />
        <span className="sidebar-label">Typomaniac</span>
      </Link>
      <SidebarNav />
      <PlayerBlock />
    </aside>
  );
}
