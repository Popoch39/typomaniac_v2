/** The letter shown in place of a missing picture; a Player without a Nickname has no letter to show. */
export function useAvatarInitial(nickname: string | null) {
  return nickname?.charAt(0).toUpperCase() || "?";
}
