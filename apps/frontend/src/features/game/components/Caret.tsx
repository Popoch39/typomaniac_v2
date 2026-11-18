/** Zero-width, through its negative margin, so the letters never move when the caret does. */
export function Caret() {
  return <span className="-mr-[2px] inline-block h-[1.2em] w-[2px] bg-primary align-text-bottom" />;
}
