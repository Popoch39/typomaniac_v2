import { StrokeIcon } from "../../../shared/components/StrokeIcon.tsx";

/** Two sliders. */
export function CustomIcon() {
  return (
    <StrokeIcon>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <circle cx="8" cy="17" r="2" />
    </StrokeIcon>
  );
}
