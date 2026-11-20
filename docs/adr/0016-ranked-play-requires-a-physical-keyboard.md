# Ranked play requires a physical keyboard: one character per insert, each backed by a KeyPress

In a ranked Duel the server refuses an `insert` that carries more than one character, and one that no KeyPress accounts for; either is a Violation (ADR 0014). Until now an `insert` could carry a text of any length and needed no KeyPress, so a changed client could send a whole word in one Event, and a Game typed without KeyPresses left nothing of the physical rhythm that the signals of ADR 0014 read. The Target words are plain lowercase words that need no composition, so a keyboard produces each of their characters with exactly one key going down.

## Considered Options

- **Keeping ranked open to on-screen keyboards**: rejected. A phone keyboard and an input method editor do not report reliable key events and insert several characters at once: their Games cannot be told apart from pasted text, and their rhythm cannot be read.
- **A separate Queue and Leaderboard for on-screen keyboards**: rejected. It splits a population that is still small in two, and leaves one of the two halves without any check on its rhythm.
- **Accepting any insert and treating a missing KeyPress as a signal**: rejected. Pasted text would count in the Round until a Review, when the rule that excludes it is one the game's own client never breaks.

## Consequences

- A phone or a tablet without a physical keyboard cannot play ranked; Practice and Custom Duels keep accepting any input.
- A Player whose browser extension or dictation tool inserts several characters at once commits a Violation without meaning to cheat, which is why a first Violation only voids the Duel (ADR 0014).
- The exact pairing of an `insert` with its KeyPress is a rule of the Duel engine, listed in its `RULES.md`; it must hold for key rollover, where the next key goes down before the last one is released.
- The rule is checked on receipt, on the path of every Event, so it has to stay a cheap pure check.
