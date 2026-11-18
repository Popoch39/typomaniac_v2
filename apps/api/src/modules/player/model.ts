import { t } from "elysia";

// Shared with the service, which cuts a provider's username down to the same rules.
export const nicknameFormat = { minLength: 3, maxLength: 20, pattern: "^[A-Za-z0-9_-]+$" };

const nickname = t.String({
  ...nicknameFormat,
  // Elysia's default validation response has another shape and loses its detail in production.
  error: () => ({ code: "NICKNAME_INVALID" }),
});

export const NicknamePut = {
  Body: t.Object({ nickname }),
};
