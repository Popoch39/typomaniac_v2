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
