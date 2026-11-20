import { t } from "elysia";

export const RootPost = {
  Response: { 200: t.Object({ players: t.Integer({ minimum: 0 }) }) },
};
