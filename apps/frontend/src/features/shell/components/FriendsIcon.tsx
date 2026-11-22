import { StrokeIcon } from "../../../shared/components/StrokeIcon.tsx";

/** Two heads side by side. */
export function FriendsIcon() {
  return (
    <StrokeIcon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14.3c1.8.8 3 2.6 3 4.7" />
    </StrokeIcon>
  );
}
