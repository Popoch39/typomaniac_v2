import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar.tsx";
import "./Shell.css";

export function ShellLayout() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-content">
        <Outlet />
      </div>
    </div>
  );
}
