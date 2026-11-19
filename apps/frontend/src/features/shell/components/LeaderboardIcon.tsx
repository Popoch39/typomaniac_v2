import { StrokeIcon } from "../../../shared/components/StrokeIcon.tsx";

/** Three bars. */
export function LeaderboardIcon() {
  return (
    <StrokeIcon>
      <path d="M4 20V12h4v8" />
      <path d="M10 20V5h4v15" />
      <path d="M16 20v-6h4v6" />
    </StrokeIcon>
  );
}
