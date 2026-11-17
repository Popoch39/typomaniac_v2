type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

export type AuthConfig = {
  baseURL: string;
  secret: string;
  github: OAuthCredentials;
  discord: OAuthCredentials;
};

const requireEnv = (env: Record<string, string | undefined>, name: string) => {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set: see apps/api/.env.example`);
  return value;
};

// Checked at startup so a missing secret stops the boot instead of failing the first sign-in.
export const requireAuthConfig = (
  env: Record<string, string | undefined> = process.env,
): AuthConfig => ({
  secret: requireEnv(env, "BETTER_AUTH_SECRET"),
  baseURL: requireEnv(env, "BETTER_AUTH_URL"),
  github: {
    clientId: requireEnv(env, "GITHUB_CLIENT_ID"),
    clientSecret: requireEnv(env, "GITHUB_CLIENT_SECRET"),
  },
  discord: {
    clientId: requireEnv(env, "DISCORD_CLIENT_ID"),
    clientSecret: requireEnv(env, "DISCORD_CLIENT_SECRET"),
  },
});
