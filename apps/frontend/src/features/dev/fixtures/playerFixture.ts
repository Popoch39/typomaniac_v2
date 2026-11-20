import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";

/** A signed-in Player wearing the Ornament of their Gold Standing, for the dev pages. */
export const playerFixture: SignedInPlayer = {
  id: "dev-player",
  nickname: "Lumen",
  avatarUrl: null,
  ornament: { tier: "gold", division: 2 },
  isAdministrator: false,
};
