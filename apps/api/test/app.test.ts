import { afterAll, expect, test } from "bun:test";
import { createApp } from "../src/app.ts";
import { createTestDb } from "./helpers/db.ts";

const testDb = await createTestDb();
afterAll(() => testDb.drop());
const app = createApp(testDb.db);

test("health responds ok", async () => {
  const response = await app.handle(new Request("http://localhost/health"));
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("ok");
});

test("unknown route responds 404", async () => {
  const response = await app.handle(new Request("http://localhost/nope"));
  expect(response.status).toBe(404);
});
