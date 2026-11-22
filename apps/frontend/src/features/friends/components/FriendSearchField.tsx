import { Input } from "../../../shared/components/ui/input.tsx";

interface FriendSearchFieldProps {
  typed: string;
  onType: (typed: string) => void;
}

export function FriendSearchField({ typed, onType }: FriendSearchFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="type-eyebrow text-ink-subtle">Nickname</span>
      <Input
        type="search"
        value={typed}
        onChange={(event) => onType(event.target.value)}
        maxLength={20}
        autoComplete="off"
        spellCheck={false}
        placeholder="Start of a Nickname"
        className="h-11 rounded-md border-2 border-key-outline bg-surface-plate px-3.5 text-base text-ink"
      />
    </label>
  );
}
