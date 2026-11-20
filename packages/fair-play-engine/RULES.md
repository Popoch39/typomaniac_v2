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

## Signals

What one ranked Game says of the typing behind it (ADR 0014). Each signal is a pure function of the Game's journal and Target words, with a name a person can read, and gives a value from 0 (typed like a person) to 1 (not like a person). A signal proves nothing: it only weighs in a Player's Suspicion. Every threshold is a starting value, to be tuned on real Games.

| Id       | Rule                                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SIGNAL-1 | `keyPressEvenness`: intervals between KeyPresses as even as a machine's. A coefficient of variation of 0.1 or less reads 1, one of 0.3 or more reads 0. An interval of 1 second or more is a pause and is left out.                        |
| SIGNAL-2 | `holdEvenness`: keys all held as long as each other. A coefficient of variation of the hold times of 0.05 or less reads 1, one of 0.15 or more reads 0.                                                                                    |
| SIGNAL-3 | `missingRollover`: at high speed (a median interval of 100 ms or less, about 120 WPM), every key released before the next one goes down. No overlap reads 1; an overlap on 20% of KeyPresses or more reads 0. Below high speed it reads 0. |
| SIGNAL-4 | `flatWordSpeed`: rare words typed as fast per character as frequent ones. A frequent word is one of the first 100 of the list the Target words are drawn from. The same pace reads 1; rare words 15% slower or more read 0.                |
| SIGNAL-5 | `superhumanSpeed`: a speed beyond what a person has ever typed. 300 WPM or less reads 0, 400 WPM or more reads 1. A fast honest typist stays at 0.                                                                                         |
| SIGNAL-6 | A Game with fewer than 20 intervals between KeyPresses, or fewer than 5 words typed without a mistake among the frequent or the rare ones, says nothing on the signals it cannot judge: they read 0.                                       |
| SIGNAL-7 | The signals carry a version (`SIGNALS_VERSION`), saved with the values they gave and raised whenever a signal is added or changed, so that every saved Game is read again with the new ones.                                               |

## Signals across Duels

What a Player's recent ranked Duels say together, where no single Game says anything (ADR 0014). The last two are how win-trading surfaces: the Queue may still pair the same two Players twice in a row. Each signal is a pure function of the Player's ranked Duels, given newest first, and reads from 0 to 1 like the signals of one Game. Every threshold is a starting value, to be tuned on real Games.

| Id       | Rule                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ACROSS-1 | `levelJump`: a WPM that jumps from one ranked Duel to the next, the mean of the Player's Games in each. Up to 1.5 times the Duel before reads 0, twice it or more reads 1. A Duel in which the Player typed nothing is no level and is left out. |
| ACROSS-2 | `errorlessSeries`: Games in a row without a single incorrect Keystroke. A series of 5 or fewer reads 0, one of 15 or more reads 1. A Game in which the Player typed nothing ends a series.                                                       |
| ACROSS-3 | `oneSidedPair`: an Opponent met again and again, one of the two always winning. Two meetings or fewer read 0, five or more read 1; an Opponent who won or lost no more than 60% of them reads 0. It reads the most one-sided Opponent.           |
| ACROSS-4 | `lossWithoutTyping`: ranked Duels lost without a single Keystroke in any of their Games. One reads 0, three or more read 1. A Duel drawn or won without typing is not counted.                                                                   |
| ACROSS-5 | The signals across Duels read the Player's `SUSPICION_DUELS` (20) most recent ranked Duels started after their last settled Review, and no older one, as the Games of REVIEW-4.                                                                  |

## Suspicion

How strongly a Player's ranked Games look like they were not typed by a person. It never sanctions: past a threshold it only calls for a Review (ADR 0014).

| Id          | Rule                                                                                                                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SUSPICION-1 | A Player's Suspicion is read from their `SUSPICION_GAMES` (20) most recent ranked Games, and no older one.                                                                                                                                                |
| SUSPICION-2 | A Game's Suspicion is the sum of its signals, each weighted by a constant share (`SIGNAL_WEIGHTS`), the shares of every signal, of one Game or across Duels, adding up to 1. Speed weighs the least: it must never bring a fast typist to a Review alone. |
| SUSPICION-3 | A Player's Suspicion is the mean of their Games' over the full window of 20, a missing Game counting as an ordinary one: one unusual Game among ordinary ones, or a few Games alone, leave it low.                                                        |
| SUSPICION-4 | The signals across Duels (ACROSS-1 to ACROSS-4) add their weighted values to the Suspicion read from the Games: a pair of Players trading wins raises it even when both type like people.                                                                 |

## Reviews

When a person looks at a Player (ADR 0014). A Review never sanctions by itself, and a Player under Review plays ranked as usual and is told nothing.

| Id       | Rule                                                                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REVIEW-1 | A Player whose Suspicion passes `SUSPICION_THRESHOLD` (0.6), a starting value kept high, gets a Review with reason Suspicion.                                                                             |
| REVIEW-2 | A Player whose Rank is Master gets a Review with reason Master, and one on the Podium (the first `PODIUM_POSITIONS`, 3) one with reason Podium, whatever their Suspicion; each once.                      |
| REVIEW-3 | At most one Review is open per Player: none opens, whatever the reason, while one is.                                                                                                                     |
| REVIEW-4 | The Suspicion that opens a Review is read only from the Games played and the ranked Duels started after the Player's last settled Review, the missing ones counting as ordinary: no Game is judged twice. |

## Purity

| Id     | Rule                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| PURE-1 | Every function is pure: it never modifies what it receives, gives the same output for the same input, and its values pass through JSON unchanged. |
