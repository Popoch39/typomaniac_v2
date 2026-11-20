import { afterAll, expect, test } from "bun:test";
import { join } from "node:path";
import { createTestDb } from "./helpers/db.ts";

const entry = join(import.meta.dir, "../src/index.ts");

const testDb = await createTestDb();
afterAll(() => testDb.drop());

test("the worker refuses to start without its database address", async () => {
  const worker = Bun.spawn(["bun", entry], {
    // Without the .env of the worker folder, so that only the variables given here are set.
    cwd: import.meta.dir,
    env: { PATH: process.env.PATH },
    stdout: "pipe",
    stderr: "pipe",
  });

  expect(await worker.exited).not.toBe(0);
  expect(await new Response(worker.stderr).text()).toContain("DATABASE_URL is not set");
});

test("the worker logs its start and its stop, as JSON lines under NODE_ENV=production", async () => {
  const worker = Bun.spawn(["bun", entry], {
    cwd: import.meta.dir,
    env: { PATH: process.env.PATH, DATABASE_URL: testDb.url, NODE_ENV: "production" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const reader = worker.stdout.getReader();
  const { value } = await reader.read();
  const started = JSON.parse(new TextDecoder().decode(value)) as { message: string };
  expect(started.message).toBe("Fair-play worker started");

  worker.kill("SIGTERM");
  expect(await worker.exited).toBe(0);
  let rest = "";
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read())
    rest += new TextDecoder().decode(chunk.value);
  const records = rest
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { message: string; logger: string });
  expect(records).toContainEqual(
    expect.objectContaining({ message: "Fair-play worker stopped", logger: "fair-play-worker" }),
  );
});
