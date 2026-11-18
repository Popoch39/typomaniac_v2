import type { SignedInPlayer } from "./useSignedInPlayer.ts";

export function useAvatar({ avatarUrl, nickname }: SignedInPlayer) {
  return {
    // Without a picture, or when it fails to load, the Avatar shows the initial instead.
    pictureUrl: avatarUrl ?? undefined,
    // A Player without a Nickname has no letter to show.
    initial: nickname?.charAt(0).toUpperCase() || "?",
  };
}
