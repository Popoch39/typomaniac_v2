import { StrokeIcon } from "../../../shared/components/StrokeIcon.tsx";

/** A keyboard. */
export function PracticeIcon() {
  return (
    <StrokeIcon>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M6 10h1" />
      <path d="M10 10h1" />
      <path d="M14 10h1" />
      <path d="M18 10h0" />
      <path d="M7 15h10" />
    </StrokeIcon>
  );
}
