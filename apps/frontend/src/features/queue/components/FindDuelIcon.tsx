import { StrokeIcon } from "../../../shared/components/StrokeIcon.tsx";

/** Crossed swords. */
export function FindDuelIcon() {
  return (
    <StrokeIcon heavy className="size-7">
      <path d="M4 4l9 9" />
      <path d="M20 4l-9 9" />
      <path d="M7 17l-3 3" />
      <path d="M17 17l3 3" />
      <path d="M5 14l5 5" />
      <path d="M19 14l-5 5" />
    </StrokeIcon>
  );
}
