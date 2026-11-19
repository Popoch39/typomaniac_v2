import { Link } from "@tanstack/react-router";
import { LogoKey } from "../../../shared/components/LogoKey.tsx";

// Not a sidebar menu button: the logo key is larger than the rail's buttons.
export function SidebarTitle() {
  return (
    <Link to="/" className="flex items-center gap-3 rounded-md pb-1.5 text-ink no-underline">
      <LogoKey />
      <span className="type-wordmark group-data-[collapsible=icon]:sr-only">Typomaniac</span>
    </Link>
  );
}
