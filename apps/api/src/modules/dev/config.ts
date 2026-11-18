export type DevOptions = {
  signIn: boolean;
};

// Opt-in rather than tied to NODE_ENV, so a deployment that forgets to set NODE_ENV still never
// lets anyone sign in as a Dev Player.
export const readDevOptions = (
  env: Record<string, string | undefined> = process.env,
): DevOptions => {
  const signIn = env.DEV_SIGN_IN === "enabled";
  if (signIn && env.NODE_ENV === "production")
    throw new Error("DEV_SIGN_IN cannot be enabled in production: see apps/api/.env.example");
  return { signIn };
};
