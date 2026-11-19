import { StrokeIcon } from "../../../shared/components/StrokeIcon.tsx";

/** A cross. */
export function LeaveIcon() {
  return (
    <StrokeIcon heavy>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </StrokeIcon>
  );
}
