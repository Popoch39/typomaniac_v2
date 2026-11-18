import { Link } from "@tanstack/react-router";
import { Keyboard } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../../shared/components/ui/sidebar.tsx";

export function SidebarTitle() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Typomaniac">
          <Link to="/custom">
            <Keyboard aria-hidden="true" />
            <span className="font-heading text-base font-semibold text-foreground">Typomaniac</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
