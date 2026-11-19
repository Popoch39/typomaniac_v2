/**
 * One caret for the whole word list, moved by a compositor-only transition so it glides between letters
 * instead of jumping. Sized like its anchor (`caretClassName`) so it lines up with the Opponent's caret.
 */
export function Caret() {
  return (
    <span
      data-caret
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 h-[1.2em] w-[2px] bg-primary transition-none duration-100 ease-out will-change-transform motion-safe:data-animated:transition-[translate]"
    />
  );
}
