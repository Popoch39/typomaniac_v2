import { t } from "elysia";

export const RootPost = {
  Response: { 200: t.Object({ count: t.Integer({ minimum: 0 }) }) },
};
