import { useQueueNotice } from "../hooks/useQueueNotice.ts";

export function QueueNotice() {
  const notice = useQueueNotice();

  if (notice === null) return null;
  return (
    <p role={notice.role} className="m-0 text-ink">
      {notice.message}
    </p>
  );
}
