import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";

interface StepKeyProps {
  label: string;
  /** `null` past the first or the last page. */
  page: number | null;
}

export function StepKey({ label, page }: StepKeyProps) {
  if (page === null) {
    return (
      <Keycap size="sm" disabled>
        {label}
      </Keycap>
    );
  }
  return (
    <Keycap size="sm" asChild>
      <Link to="/leaderboard" search={{ page }}>
        {label}
      </Link>
    </Keycap>
  );
}
