interface AcceptCountdownProps {
  timeLeft: string;
  /** The share of the time to accept still left, from 1 down to 0. */
  drainedShare: number;
}

// The bar only echoes the server's window: the server decides when it closes.
export function AcceptCountdown({ timeLeft, drainedShare }: AcceptCountdownProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 font-mono text-[13px] font-bold text-ink-muted">
        Both Players must Accept within{" "}
        <span role="timer" aria-label="Time left to accept the Duel">
          {timeLeft}
        </span>
      </p>
      <div
        aria-hidden="true"
        className="h-3 overflow-hidden rounded-xs border-2 border-key-outline bg-key-edge"
      >
        <div
          className="h-full bg-action transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${drainedShare * 100}%` }}
        />
      </div>
    </div>
  );
}
