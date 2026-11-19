import { expect, test } from "bun:test";
import { reconnectDelay } from "../src/shared/lib/reconnectDelay.ts";

const SERVICE_RESTART = 1012;
const ABNORMAL_CLOSURE = 1006;

test("a socket closed by a server restart is tried again, a little later after each failed try", () => {
  expect(reconnectDelay(SERVICE_RESTART, 1)).toBe(500);
  expect(reconnectDelay(SERVICE_RESTART, 2)).toBe(1000);
  expect(reconnectDelay(SERVICE_RESTART, 3)).toBe(2000);
  expect(reconnectDelay(SERVICE_RESTART, 4)).toBe(4000);
  expect(reconnectDelay(SERVICE_RESTART, 5)).toBe(8000);
});

test("a dropped socket is tried again like a restarted server", () => {
  expect(reconnectDelay(ABNORMAL_CLOSURE, 1)).toBe(500);
  expect(reconnectDelay(ABNORMAL_CLOSURE, 5)).toBe(8000);
});

test("no try is made beyond the last one", () => {
  expect(reconnectDelay(SERVICE_RESTART, 6)).toBeNull();
  expect(reconnectDelay(ABNORMAL_CLOSURE, 6)).toBeNull();
});

test("a socket the server closed on purpose is never tried again", () => {
  // A takeover by another tab, a finished Duel, or a flood.
  expect(reconnectDelay(1000, 1)).toBeNull();
  expect(reconnectDelay(1008, 1)).toBeNull();
  expect(reconnectDelay(1011, 1)).toBeNull();
});
