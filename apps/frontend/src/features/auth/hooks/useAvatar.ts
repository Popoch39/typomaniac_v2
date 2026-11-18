import { useState } from "react";
import type { SignedInPlayer } from "./useSignedInPlayer.ts";

export function useAvatar({ avatarUrl, nickname }: SignedInPlayer) {
  // Remembers which picture failed rather than a flag, so a new picture gets its own chance to load.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return {
    pictureUrl: avatarUrl === failedUrl ? null : avatarUrl,
    onPictureError: () => setFailedUrl(avatarUrl),
    // A Player without a Nickname has no letter to show.
    initial: nickname?.charAt(0).toUpperCase() || "?",
  };
}
