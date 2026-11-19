import { expect, test } from "bun:test";
import { join } from "node:path";

const entry = join(import.meta.dir, "../src/index.ts");

test("the matchmaker refuses to start without its Redis address", async () => {
  const matchmaker = Bun.spawn(["bun", entry], {
    // Without the .env of the matchmaker folder, so that only the variables given here are set.
    cwd: import.meta.dir,
    env: { PATH: process.env.PATH },
    stdout: "pipe",
    stderr: "pipe",
  });

  expect(await matchmaker.exited).not.toBe(0);
  expect(await new Response(matchmaker.stderr).text()).toContain("REDIS_URL is not set");
});

test("the matchmaker logs its start and its stop, as JSON lines under NODE_ENV=production", async () => {
  const matchmaker = Bun.spawn(["bun", entry], {
    cwd: import.meta.dir,
    env: { PATH: process.env.PATH, REDIS_URL: process.env.REDIS_URL, NODE_ENV: "production" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const reader = matchmaker.stdout.getReader();
  const { value } = await reader.read();
  const started = JSON.parse(new TextDecoder().decode(value)) as { message: string };
  expect(started.message).toBe("Matchmaker started");

  matchmaker.kill("SIGTERM");
  expect(await matchmaker.exited).toBe(0);
  let rest = "";
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read())
    rest += new TextDecoder().decode(chunk.value);
  const records = rest
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { message: string; logger: string });
  expect(records).toContainEqual(
    expect.objectContaining({ message: "Matchmaker stopped", logger: "matchmaker" }),
  );
});
