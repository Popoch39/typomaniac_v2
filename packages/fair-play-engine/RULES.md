# Fair-play engine rules

This document lists every rule that `@repo/fair-play-engine` applies, with its identifier. Test names reuse these identifiers. Why cheating is judged as it is, and what it costs, is recorded in ADR 0014, ADR 0015 and ADR 0016; the vocabulary is that of the "Fair play" section of `GLOSSARY.md`.

## Configuration

Starting values, held as constants until real Games show how to tune them.

| Id       | Rule                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------- |
| CONFIG-1 | A Player's first Suspension lasts 3 days; every later one lasts 14 days.                                 |
| CONFIG-2 | A Suspension or a Ban voids every ranked Duel the Player won in the 14 days before it, and no older one. |

## Account age

A throwaway GitHub or Discord account must cost time before it can play ranked (ADR 0014). The creation instant of an account is the one its provider gives: GitHub's profile date, the instant encoded in Discord's identifier.

| Id    | Rule                                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AGE-1 | A Player may queue from `MIN_ACCOUNT_AGE_MS` (7 days) after the creation of their provider account.                                                                                     |
| AGE-2 | With two linked accounts, the older one counts: linking a new account never closes the Queue.                                                                                           |
| AGE-3 | An account whose creation instant is not recorded yet is left out; with none recorded, the instant ranked opens is unknown, and the Player is asked to sign in again, which records it. |

## Violations

A Violation is proof, so it is the only cheating sanctioned automatically, one step up the Sanctions at each repeat (ADR 0014). A first one only voids the Duel: a browser extension can produce one for a Player who is not cheating (ADR 0016).

| Id          | Rule                                                                                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VIOLATION-1 | A Player's first sanctioned Violation voids its Duel, the second suspends them for 3 days, the third for 14 days, and the fourth and any after it ban them. Several in one Duel count as one. |

## Purity

| Id     | Rule                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| PURE-1 | Every function is pure: it never modifies what it receives, gives the same output for the same input, and its values pass through JSON unchanged. |
