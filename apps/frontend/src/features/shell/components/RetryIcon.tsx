import { StrokeIcon } from "../../../shared/components/StrokeIcon.tsx";

/** A circling arrow: read again. */
export function RetryIcon() {
  return (
    <StrokeIcon>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </StrokeIcon>
  );
}
