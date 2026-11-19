// Off unless set: reached directly, any client could write X-Forwarded-For and pick the IP it is
// counted against.
export const readTrustProxy = (env: Record<string, string | undefined> = process.env) =>
  env.TRUST_PROXY === "enabled";
