// A Guest has no database row: who they are lives in a cookie the API signs, so a client can neither
// forge one nor take another Guest's identity, and keeps it for as long as the cookie lives.
const COOKIE_NAME = "guest";
// Outlives any Duel, so a Guest who comes back to theirs is recognised.
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;
// Player ids come from Better Auth and never carry it, so a Guest can never be taken for a Player.
const ID_PREFIX = "guest:";

export type Guest = { readonly id: string; readonly name: string };

const encoder = new TextEncoder();

export const createGuestCookies = (secret: Promise<string>) => {
  const key = secret.then((value) =>
    crypto.subtle.importKey(
      "raw",
      encoder.encode(value),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    ),
  );

  const sign = async (payload: string) =>
    Buffer.from(await crypto.subtle.sign("HMAC", await key, encoder.encode(payload))).toString(
      "base64url",
    );

  return {
    /** The Guest the cookie names, or null when it is absent, unsigned or tampered with. */
    read: async (headers: Headers): Promise<Guest | null> => {
      const value = new Bun.CookieMap(headers.get("cookie") ?? "").get(COOKIE_NAME);
      const [payload, signature, ...rest] = value?.split(".") ?? [];
      if (!payload || !signature || rest.length > 0) return null;
      const signed = await crypto.subtle.verify(
        "HMAC",
        await key,
        Buffer.from(signature, "base64url"),
        encoder.encode(payload),
      );
      if (!signed) return null;
      return JSON.parse(Buffer.from(payload, "base64url").toString()) as Guest;
    },
    /** A new Guest, with the Set-Cookie header value that hands them their identity. */
    issue: async () => {
      const guest: Guest = {
        id: `${ID_PREFIX}${crypto.randomUUID()}`,
        name: `Guest ${1000 + Math.floor(Math.random() * 9000)}`,
      };
      const payload = Buffer.from(JSON.stringify(guest)).toString("base64url");
      const cookie = new Bun.Cookie(COOKIE_NAME, `${payload}.${await sign(payload)}`, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE_SECONDS,
      });
      return { guest, setCookie: cookie.serialize() };
    },
  };
};
