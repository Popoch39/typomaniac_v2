import { makeSignature } from "better-auth/crypto";
import type { Auth } from "../auth/service.ts";
import type { UnwrapSchema } from "elysia";
import type * as DevModel from "./model.ts";

type DevPlayerNickname = UnwrapSchema<typeof DevModel.SignInPost.Body>["nickname"];

// The .invalid domain can never belong to anyone, so no real Player is ever found or merged under it.
const emailOf = (nickname: DevPlayerNickname) => `${nickname}@dev.invalid`;

// No provider made a Dev Player's account: it is dated far enough back for ranked play to open at
// once, so two windows can queue against each other (ADR 0014).
const DEV_ACCOUNT_CREATED_AT = new Date(0);

/** A session for the Dev Player of that name, created on first use, with its Set-Cookie header value. */
export const signInDevPlayer = async (auth: Auth, nickname: DevPlayerNickname) => {
  const { internalAdapter, authCookies, secret, sessionConfig } = await auth.$context;
  const email = emailOf(nickname);
  const found = await internalAdapter.findUserByEmail(email);
  // createOAuthUser rather than createUser, which refuses to run outside a request. The name
  // becomes the default Nickname, through the same hook as a provider username.
  // createOAuthUser's type leaves out the additional fields of the account, which it writes all the same.
  const devAccount = {
    providerId: "dev",
    accountId: nickname,
    providerCreatedAt: DEV_ACCOUNT_CREATED_AT,
  };
  const player =
    found?.user ??
    (
      await internalAdapter.createOAuthUser(
        { name: nickname, email, emailVerified: true },
        devAccount,
      )
    ).user;
  const { token } = await internalAdapter.createSession(player.id);
  const { name, attributes } = authCookies.sessionToken;
  // Better Auth only accepts a session cookie signed with its secret.
  const cookie = new Bun.Cookie(name, `${token}.${await makeSignature(token, secret)}`, {
    path: attributes.path ?? "/",
    httpOnly: attributes.httpOnly,
    secure: attributes.secure ?? false,
    sameSite: "lax",
    maxAge: sessionConfig.expiresIn,
  });
  return { playerId: player.id, setCookie: cookie.serialize() };
};
