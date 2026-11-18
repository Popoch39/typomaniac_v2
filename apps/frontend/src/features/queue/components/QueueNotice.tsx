import { useQueueNotice } from "../hooks/useQueueNotice.ts";

export function QueueNotice() {
  const notice = useQueueNotice();

  if (notice === null) return null;
  return (
    <p role={notice.role} className="text-base">
      {notice.message}
    </p>
  );
}
