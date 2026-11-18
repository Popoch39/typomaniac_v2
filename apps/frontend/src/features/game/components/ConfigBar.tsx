import { useConfigBar } from "../hooks/useConfigBar.ts";

const optionClassName =
  "cursor-pointer border-0 bg-transparent px-2 py-1 text-muted-foreground aria-pressed:text-primary";

export function ConfigBar() {
  const { modes, mode, values, value, selectMode, selectValue, keepTypingFocus } = useConfigBar();

  return (
    <div className="mb-6 flex gap-8">
      <div className="flex gap-2">
        {modes.map((option) => (
          <button
            key={option}
            type="button"
            className={optionClassName}
            aria-pressed={option === mode}
            onMouseDown={keepTypingFocus}
            onClick={() => selectMode(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {values.map((option) => (
          <button
            key={option}
            type="button"
            className={optionClassName}
            aria-pressed={option === value}
            onMouseDown={keepTypingFocus}
            onClick={() => selectValue(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
