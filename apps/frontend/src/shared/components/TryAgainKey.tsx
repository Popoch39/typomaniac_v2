import { Keycap } from "./Keycap.tsx";

interface TryAgainKeyProps {
  onRetry: () => void;
}

export function TryAgainKey({ onRetry }: TryAgainKeyProps) {
  return (
    <Keycap size="sm" onClick={onRetry}>
      Try again
    </Keycap>
  );
}
