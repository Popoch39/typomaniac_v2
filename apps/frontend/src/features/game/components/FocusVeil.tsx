type FocusVeilProps = {
  inputId: string;
};

/** A label, so a click on it gives the focus back to the input without any handler. */
export function FocusVeil({ inputId }: FocusVeilProps) {
  return (
    <label className="focus-veil" htmlFor={inputId}>
      Click to focus
    </label>
  );
}
