import { StrokeIcon } from "./StrokeIcon.tsx";

/** An exclamation mark in a circle, in the danger colour. */
export function DangerIcon() {
  return (
    <StrokeIcon className="text-danger">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5v.01" />
    </StrokeIcon>
  );
}
