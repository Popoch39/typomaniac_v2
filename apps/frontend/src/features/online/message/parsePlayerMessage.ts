/** What the Player socket sends, as the server's schemas send it. */
export type PlayerServerMessage = { readonly type: "onlineCount"; readonly count: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPlayerMessage = (value: unknown): value is PlayerServerMessage =>
  isRecord(value) &&
  value.type === "onlineCount" &&
  Number.isInteger(value.count) &&
  Number(value.count) >= 0;

/**
 * The message a frame from the Player socket carries, `null` for a frame that is not one: a client
 * never acts on what it cannot read.
 */
export function parsePlayerMessage(frame: string): PlayerServerMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(frame);
  } catch {
    return null;
  }
  return isPlayerMessage(value) ? value : null;
}
