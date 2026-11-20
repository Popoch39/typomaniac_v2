import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";

/** A signed-in Player without a picture or an Ornament, for the dev pages. */
export const signedInPlayerFixture: SignedInPlayer = {
  id: "dev-states-player",
  nickname: "dev_alice",
  avatarUrl: null,
  ornament: null,
  isAdministrator: false,
};
