# Duel engine rules

This document lists every rule that `@repo/duel-engine` applies, with its identifier. Test names reuse these identifiers. The typing rules of each Game are those of `@repo/typing-engine` (see its `RULES.md`); this package only adds what a Duel decides on top of them.

## Configuration

| Id       | Rule                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| CONFIG-1 | A Duel Game is a `time` Game of 30 seconds: it ends at the first Tick that reaches 30 seconds after its Start.           |
| CONFIG-2 | A Round has 250 Target words, drawn once; no word is added during the Round.                                             |
| CONFIG-3 | The Countdown lasts 3 seconds. The server waits 2 seconds after a Game's deadline before applying its final Tick itself. |
| CONFIG-4 | The server accepts a Participant's `start` up to 1 second before or after the announced Start, on its own clock.         |
| CONFIG-5 | An Event may be stamped up to 1 second behind its receipt before its timestamp is moved up.                              |
| CONFIG-6 | A Duel is won with 2 Rounds and has 3 Rounds at most. The pause between two Rounds lasts 5 seconds.                      |
| CONFIG-7 | A ranked Duel whose Players are not both connected has its first Countdown announced 10 seconds after its creation.      |

## Multiplier

What each validated word of a Game weighs in its Points (ADR 0013). The Multiplier is read from the Game, never from its Result, which does not hold what each word was.

| Id            | Rule                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| MULTIPLIER-1  | A Perfect word weighs 1 when it starts a Streak, then 0.02 more than the Perfect word before it.                           |
| MULTIPLIER-2  | From the sixth Perfect word in a row, a word weighs 1.10 and no more.                                                      |
| MULTIPLIER-3  | A word with an incorrect Keystroke weighs 1 and ends the Streak.                                                           |
| MULTIPLIER-4  | A mistake corrected before the word is validated still ends the Streak.                                                    |
| MULTIPLIER-5  | A word validated with a Missed letter ends the Streak.                                                                     |
| MULTIPLIER-6  | The word being typed when the clock stops is not counted.                                                                  |
| MULTIPLIER-7  | A Game's Multiplier is the average over its validated words, 1 when it has none.                                           |
| MULTIPLIER-8  | A validated word reopened to correct its mistake stays imperfect.                                                          |
| MULTIPLIER-9  | On a perfect Game, 40 WPM averages ×1.085 and 100 WPM ×1.094: the Multiplier does not grow with the number of words typed. |
| MULTIPLIER-10 | The current Multiplier, shown live, is the one the Streak has reached: that of the last validated word, up to 1.10.        |
| MULTIPLIER-11 | A mistake brings the current Multiplier back to 1 at once, even in the word being typed.                                   |

## Points

What a Game of a Duel is worth (ADR 0012, ADR 0013). Points are computed from WPM, Accuracy and the average Multiplier, so a Result and Live stats give them alike.

| Id       | Rule                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| POINTS-1 | Points are WPM × (Accuracy / 100)² × 10 × M: 100 WPM at 93 % Accuracy is worth 865 Points, 90 WPM at 99 % is worth 882. |
| POINTS-2 | Points are rounded to the nearest integer.                                                                              |
| POINTS-3 | Nothing typed is worth 0 Points.                                                                                        |
| POINTS-4 | Live stats give Points by the same rule as a Result.                                                                    |
| POINTS-5 | Points are multiplied by the average Multiplier, and rounded once, at the end.                                          |
| POINTS-6 | A perfect 90 WPM Game (984 Points) beats 100 WPM at 95 % (903 Points); a perfect 70 WPM Game (764 Points) does not.     |

## Outcome of a Round

A Round is decided by the Points of both Games, each with its average Multiplier, computed by the server (ADR 0012, ADR 0013).

| Id        | Rule                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| OUTCOME-1 | The Participant with more Points wins the Round: at equal Accuracy, the higher WPM wins.                      |
| OUTCOME-2 | A slower Participant with enough extra Accuracy has more Points and wins the Round.                           |
| OUTCOME-3 | At equal Points, the Round is a draw, whatever the WPM and Accuracy: there is no tie-break.                   |
| OUTCOME-4 | The Outcome is computed once per Participant; the two Outcomes of a Round are win and loss, or draw and draw. |
| OUTCOME-5 | The Multiplier can turn a Round: a perfect 90 WPM Game beats 100 WPM at 95 % only with it.                    |
| OUTCOME-6 | Equal Points with their Multipliers are still a draw: there is no tie-break on the Multiplier.                |

## Rounds

The Outcomes of a Duel are a function of the Outcomes of its Rounds so far (ADR 0010).

| Id      | Rule                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| ROUND-1 | The Round score counts the Rounds each Participant won; a drawn Round counts for neither.                     |
| ROUND-2 | A Duel is not decided while no Participant has won 2 Rounds and fewer than 3 Rounds are played.               |
| ROUND-3 | The first Participant to win 2 Rounds wins the Duel and the Opponent loses it: a 2-0 Duel has no third Round. |
| ROUND-4 | After 3 Rounds, the Duel goes to the Participant who won more Rounds.                                         |
| ROUND-5 | After 3 Rounds won equally, the Duel is a draw.                                                               |

## Timestamp bound

The server compares elapsed times, never absolute clocks: the time elapsed on the client since its `start`, against the time elapsed on the server since the anchor of that `start` (ADR 0009).

| Id          | Rule                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| TIMESTAMP-1 | A Game's `start` is anchored at the earlier of the instant the server received it and the announced Start.                                   |
| TIMESTAMP-2 | An Event stamped at most 1 second behind its receipt keeps the timestamp its client sent.                                                    |
| TIMESTAMP-3 | An Event stamped more than 1 second behind its receipt keeps its content and has its timestamp moved up to that bound; it is never dropped.  |
| TIMESTAMP-4 | A timestamp ahead of its receipt is left alone.                                                                                              |
| TIMESTAMP-5 | The bound only grows with the receipt, so a moved Event never lands after a later one.                                                       |
| TIMESTAMP-6 | The final Tick the server applies to a silent Game is stamped 30 seconds after its start, and no earlier than the last Event of its journal. |

## Word draw

| Id      | Rule                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| WORDS-1 | The draw picks common words, each chosen by the random source it is given: no clock, no global random.                        |
| WORDS-2 | The same random source gives the same words: the draw is deterministic.                                                       |
| WORDS-3 | The draw never gives the same word twice in a row, nor a first word equal to the word the drawn words follow, when given one. |
| WORDS-4 | The common words are distinct lowercase words, without any space.                                                             |

## Seats

| Id     | Rule                                                                                 |
| ------ | ------------------------------------------------------------------------------------ |
| SEAT-1 | The Opponent of a Participant sits on the other seat: seat 0 faces seat 1, and back. |

## Messages

| Id        | Rule                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| MESSAGE-1 | Every message exchanged over the WebSocket, in either direction, is plain JSON: it passes through JSON unchanged. |
