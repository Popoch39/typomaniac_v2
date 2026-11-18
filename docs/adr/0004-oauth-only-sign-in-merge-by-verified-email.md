# Sign-in: GitHub and Discord OAuth only, merge by verified email, in-house Nickname

A Guest becomes a Player by signing in with GitHub or Discord, via Better Auth `1.7.25`. There is no other method: no email + password, no magic link, no anonymous session. The app therefore stores no password and sends no email. A Player corresponds to one email address: two providers presenting the same verified address are attached to the same Player, with no action on their part. An address that the provider does not mark as verified is refused with the `email_not_verified` error, when creating a Player, when attaching a provider and on every later sign-in. The Nickname is a column and a route of the API, not Better Auth's `username` plugin.

## Considered Options

- **Email + password or magic link**: rejected. We would have to store passwords, send emails (verification, reset) and therefore pick a sending provider. The targeted players already have a GitHub or Discord account.
- **One Player per provider, manual linking**: rejected. The same Player would end up with two Nicknames and two histories depending on the button clicked, and we would need a screen to manage linked providers.
- **Merging without requiring a verified address**: rejected. Declaring someone's address at a provider would be enough to enter their Player.
- **Sticking to Better Auth's default check for attaching** (without `trustedProviders`): rejected. It does refuse an unverified address, but with the generic `account_not_linked` error, and it lets a Player be created with an unverified address. The refusal goes through `user.validateUserInfo`, which covers the three cases with the same error.
- **Better Auth's `username` plugin for the Nickname**: rejected. It serves sign-in by nickname + password, which we do not enable, and it imposes its own format rules and routes.

## Consequences

- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are required at API startup, like `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.
- `account.accountLinking.trustedProviders` contains `github` and `discord`. This option makes a provider attach without checking whether the address is verified: it is only safe because `validateUserInfo` runs before the attachment. Removing that check while keeping the option opens Player takeover through an unverified address; a test plays this scenario end to end.
- The `/api/auth/link-social` route is disabled. Its ID-token variant is the only Better Auth 1.7.25 attachment that does not go through `validateUserInfo`. GitHub and Discord do not offer it, but an OpenID Connect provider (Google, Apple) added to the trusted providers would make it exploitable. To be reviewed on every Better Auth version bump and before adding a provider.
- A Player whose address is no longer verified at the provider (address changed, not yet confirmed) can no longer sign in through that provider until they verify it.
- With `validateUserInfo`, Better Auth refuses to create a Player outside an HTTP request. Tests therefore cannot go through `internalAdapter.createUser`.
- The real OAuth flow (redirect, consent, callback) is not tested automatically: tests replace the GitHub and Discord HTTP APIs, the rest is checked by hand with a GitHub OAuth App and a dev Discord app.
- There is neither address change nor Player deletion. Deletion will become necessary before a public opening.
- The Nickname, its rules and its route are on us: format, case-insensitive uniqueness, reserved names.
