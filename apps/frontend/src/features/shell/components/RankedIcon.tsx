import { StrokeIcon } from "../../../shared/components/StrokeIcon.tsx";

/** Three stacked chevrons. */
export function RankedIcon() {
  return (
    <StrokeIcon>
      <path d="M5 15l7-6 7 6" />
      <path d="M5 20l7-6 7 6" />
      <path d="M5 10l7-6 7 6" />
    </StrokeIcon>
  );
}
