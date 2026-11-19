import { expect, test } from "bun:test";
import { join } from "node:path";

const entry = join(import.meta.dir, "../src/index.ts");

// Run from the test folder, away from the .env of the API folder, with the variables of this test
// process minus the ones each test sets itself.
const startApi = (env: Record<string, string>) => {
  const {
    NODE_ENV: _nodeEnv,
    LOG_LEVEL: _logLevel,
    DEV_SIGN_IN: _devSignIn,
    ...inherited
  } = process.env;
  return Bun.spawn(["bun", entry], {
    cwd: import.meta.dir,
    env: {
      ...inherited,
      MIGRATIONS_DIR: join(import.meta.dir, "../drizzle"),
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
};

const freePort = () => {
  const probe = Bun.serve({ port: 0, fetch: () => new Response() });
  const { port } = probe;
  void probe.stop(true);
  return port;
};

// Reads the API's output until it answers on its port, then stops it.
const outputUntilReady = async (api: ReturnType<typeof startApi>, port: string) => {
  for (let tries = 0; tries < 100; tries += 1) {
    const healthy = await fetch(`http://localhost:${port}/health`).then(
      (response) => response.ok,
      () => false,
    );
    if (healthy) break;
    await Bun.sleep(100);
  }
  api.kill();
  await api.exited;
  return new Response(api.stdout).text();
};

test("under NODE_ENV=production, the API writes one JSON object per line on stdout", async () => {
  const port = String(freePort());
  const output = await outputUntilReady(startApi({ NODE_ENV: "production", PORT: port }), port);

  const lines = output.trim().split("\n");
  expect(lines.length).toBeGreaterThan(0);
  const records = lines.map((line) => JSON.parse(line) as { level: string; logger: string });
  expect(records).toContainEqual(expect.objectContaining({ level: "INFO", logger: "api" }));
});

test("outside production, the API writes readable lines", async () => {
  const port = String(freePort());
  const output = await outputUntilReady(startApi({ PORT: port }), port);

  const [line] = output.trim().split("\n");
  expect(line).toContain(port);
  expect(() => JSON.parse(line ?? "")).toThrow();
});

test("LOG_LEVEL=warn hides the info lines", async () => {
  const port = String(freePort());
  const output = await outputUntilReady(
    startApi({ NODE_ENV: "production", LOG_LEVEL: "warn", PORT: port }),
    port,
  );

  expect(output).toBe("");
});

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
