import { Link } from "@tanstack/react-router";
import { BrandMark } from "../../../shared/components/BrandMark.tsx";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../../shared/components/ui/sidebar.tsx";

export function SidebarTitle() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Below 24px the logo's wave blurs into a line, so the rail trades padding for size. */}
        <SidebarMenuButton
          asChild
          tooltip="Typomaniac"
          className="group-data-[collapsible=icon]:p-1!"
        >
          <Link to="/">
            <BrandMark className="size-6!" />
            <span className="font-heading text-base font-semibold text-foreground">Typomaniac</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
