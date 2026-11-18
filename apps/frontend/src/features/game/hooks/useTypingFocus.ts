import { useId, useState } from "react";

/** Starts focused because the input takes the focus as soon as it mounts. */
export function useTypingFocus() {
  const [isFocused, setIsFocused] = useState(true);
  const inputId = useId();

  return {
    inputId,
    isFocused,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  };
}
