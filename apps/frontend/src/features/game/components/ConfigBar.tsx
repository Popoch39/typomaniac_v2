import { useConfigBar } from "../hooks/useConfigBar.ts";

export function ConfigBar() {
  const { modes, mode, values, value, selectMode, selectValue, keepTypingFocus } = useConfigBar();

  return (
    <div className="config-bar">
      <div className="config-group">
        {modes.map((option) => (
          <button
            key={option}
            type="button"
            className="config-option"
            aria-pressed={option === mode}
            onMouseDown={keepTypingFocus}
            onClick={() => selectMode(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="config-group">
        {values.map((option) => (
          <button
            key={option}
            type="button"
            className="config-option"
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
