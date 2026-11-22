interface ChallengeCountdownProps {
  /** The share of the time to answer still left, from 1 down to 0. */
  share: number;
}

// The bar only echoes the server's window: the server decides when the Challenge expires.
export function ChallengeCountdown({ share }: ChallengeCountdownProps) {
  return (
    <div
      aria-hidden="true"
      className="h-3 overflow-hidden rounded-xs border-2 border-key-outline bg-key-edge"
    >
      <div
        className="h-full bg-action transition-[width] duration-300 ease-linear motion-reduce:transition-none"
        style={{ width: `${share * 100}%` }}
      />
    </div>
  );
}
