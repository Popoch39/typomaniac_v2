/** What an Avatar is drawn from: the picture, and the Nickname or Guest name giving its initial. */
export type AvatarPlayer = { nickname: string | null; avatarUrl: string | null };

export function useAvatar({ avatarUrl, nickname }: AvatarPlayer) {
  return {
    // Without a picture, or when it fails to load, the Avatar shows the initial instead.
    pictureUrl: avatarUrl ?? undefined,
    // A Player without a Nickname has no letter to show.
    initial: nickname?.charAt(0).toUpperCase() || "?",
  };
}
