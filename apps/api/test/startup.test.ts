import { expect, test } from "bun:test";
import { join } from "node:path";

const entry = join(import.meta.dir, "../src/index.ts");

test("the API refuses to start without its Redis address, before touching Postgres", async () => {
  const server = Bun.spawn(["bun", entry], {
    // Without the .env of the API folder, so that only the variables given here are set.
    cwd: import.meta.dir,
    env: {
      PATH: process.env.PATH,
      // Nothing listens there: reaching Postgres would fail with another message, or hang.
      DATABASE_URL: "postgres://nobody:nothing@127.0.0.1:9/none",
      BETTER_AUTH_SECRET: "a-secret-of-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
      GITHUB_CLIENT_ID: "github-id",
      GITHUB_CLIENT_SECRET: "github-secret",
      DISCORD_CLIENT_ID: "discord-id",
      DISCORD_CLIENT_SECRET: "discord-secret",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  expect(await server.exited).not.toBe(0);
  expect(await new Response(server.stderr).text()).toContain("REDIS_URL is not set");
});
