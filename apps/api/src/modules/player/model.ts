import { t } from "elysia";

const nickname = t.String({
  minLength: 3,
  maxLength: 20,
  pattern: "^[A-Za-z0-9_-]+$",
  // Elysia's default validation response has another shape and loses its detail in production.
  error: () => ({ code: "NICKNAME_INVALID" }),
});

export const NicknamePut = {
  Body: t.Object({ nickname }),
};
