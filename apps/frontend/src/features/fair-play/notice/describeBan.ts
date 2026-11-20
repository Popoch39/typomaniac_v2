/**
 * What the sign-in screen tells a banned Player: that they can no longer sign in, with any of the
 * identities the Ban refuses, and the address to contest it. Never why (ADR 0014).
 */
export function describeBan(appealAddress: string) {
  return {
    summary:
      "You are banned: you can no longer sign in, with this GitHub or Discord account or with this e-mail.",
    appealAddress,
    appealLink: `mailto:${appealAddress}`,
  };
}
