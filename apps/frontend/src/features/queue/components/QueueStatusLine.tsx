interface QueueStatusLineProps {
  message: string;
}

export function QueueStatusLine({ message }: QueueStatusLineProps) {
  return (
    <p
      role="status"
      className="m-0 rounded-lg border-2 border-key-outline bg-surface-plate p-4 type-status text-ink"
    >
      {message}
    </p>
  );
}
