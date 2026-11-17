import { t } from "elysia";

const pseudo = t.String({
  minLength: 3,
  maxLength: 20,
  pattern: "^[A-Za-z0-9_-]+$",
  // Elysia's default validation response has another shape and loses its detail in production.
  error: () => ({ code: "PSEUDO_INVALID" }),
});

export const PseudoPut = {
  Body: t.Object({ pseudo }),
};
