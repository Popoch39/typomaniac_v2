/** What one signal said of a Game, as the administration route gives it. */
export type SignalValue = { readonly name: string; readonly value: number };

// The fair-play engine's signal names, worded for the administrator.
const LABELS: Readonly<Record<string, string>> = {
  keyPressEvenness: "Even intervals between KeyPresses",
  holdEvenness: "Even hold times",
  missingRollover: "No overlap between KeyPresses at speed",
  flatWordSpeed: "Same speed on frequent and rare words",
  superhumanSpeed: "Speed beyond any person's",
  browserHints: "Keys from a script or an automated browser",
};

/**
 * The signals of one Game as a Review shows them, in the order the server gives: each with its name,
 * a label a person can read (its name when the page does not know it yet, so a new signal still
 * shows) and its value between 0 and 1. A Game not read yet shows none.
 */
export function signalRows(signals: readonly SignalValue[] | null) {
  return (signals ?? []).map(({ name, value }) => ({
    name,
    label: LABELS[name] ?? name,
    value: value.toFixed(2),
  }));
}
