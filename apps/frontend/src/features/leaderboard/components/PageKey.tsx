import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { cn } from "../../../shared/lib/utils.ts";

interface PageKeyProps {
  page: number;
  isCurrent: boolean;
}

// The current page's key stays sunk, as if held down.
export function PageKey({ page, isCurrent }: PageKeyProps) {
  return (
    <Keycap size="sm" asChild className={cn("min-w-11 px-3", isCurrent && "keycap-pressed")}>
      <Link
        to="/leaderboard"
        search={{ page }}
        aria-label={`Page ${page}`}
        aria-current={isCurrent ? "page" : undefined}
      >
        {page}
      </Link>
    </Keycap>
  );
}
