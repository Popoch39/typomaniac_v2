import { createAuth } from "../../src/auth.ts";
import type { Db } from "../../src/db/client.ts";

// Each test file builds its own instance on its own database, like the app it is injected into.
export const createTestAuth = (db: Db) =>
  createAuth(db, {
    baseURL: "http://localhost",
    secret: "test-secret-of-at-least-32-characters",
  });
