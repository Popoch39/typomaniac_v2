type FocusVeilProps = {
  inputId: string;
};

/** A label, so a click on it gives the focus back to the input without any handler. */
export function FocusVeil({ inputId }: FocusVeilProps) {
  return (
    <label
      className="absolute inset-0 flex cursor-pointer items-center justify-center text-foreground backdrop-blur-[4px]"
      htmlFor={inputId}
    >
      Click to focus
    </label>
  );
}
