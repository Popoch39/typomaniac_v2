import { cn } from "../../../shared/lib/utils.ts";

interface FriendKeyFailureProps {
  failure: string | null;
  /** Where the failure hangs under the key: centred on it, or from its end edge. */
  align?: "center" | "end";
}

/** Why a Friend key failed, under the key and out of the flow, so that it moves nothing around it. */
export function FriendKeyFailure({ failure, align = "center" }: FriendKeyFailureProps) {
  return (
    <p
      role="alert"
      className={cn(
        "absolute top-full z-10 m-0 mt-2 whitespace-nowrap text-danger",
        align === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
      )}
    >
      {failure}
    </p>
  );
}
