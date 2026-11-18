# Duel engine rules

This document lists every rule that `@repo/duel-engine` applies, with its identifier. Test names reuse these identifiers. The typing rules of each Game are those of `@repo/typing-engine` (see its `RULES.md`); this package only adds what a Duel decides on top of them.

## Configuration

| Id       | Rule                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| CONFIG-1 | A Duel Game is a `time` Game of 30 seconds: it ends at the first Tick that reaches 30 seconds after its Start.           |
| CONFIG-2 | A Duel draws 250 Target words once, at its creation; no word is added during the Duel.                                   |
| CONFIG-3 | The Countdown lasts 3 seconds. The server waits 2 seconds after a Game's deadline before applying its final Tick itself. |
| CONFIG-4 | The server accepts a Participant's `start` up to 1 second before or after the announced Start, on its own clock.         |
| CONFIG-5 | An Event may be stamped up to 1 second behind its receipt before its timestamp is moved up.                              |

## Outcome

| Id        | Rule                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| OUTCOME-1 | The Participant with the higher WPM wins, whatever the Accuracy.                                             |
| OUTCOME-2 | At equal WPM, the Participant with the higher Accuracy wins.                                                 |
| OUTCOME-3 | At equal WPM and equal Accuracy, the Duel is a draw.                                                         |
| OUTCOME-4 | The Outcome is computed once per Participant; the two Outcomes of a Duel are win and loss, or draw and draw. |

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
