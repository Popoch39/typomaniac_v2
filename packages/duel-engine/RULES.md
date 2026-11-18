# Duel engine rules

This document lists every rule that `@repo/duel-engine` applies, with its identifier. Test names reuse these identifiers. The typing rules of each Game are those of `@repo/typing-engine` (see its `RULES.md`); this package only adds what a Duel decides on top of them.

## Configuration

| Id       | Rule                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| CONFIG-1 | A Duel Game is a `time` Game of 30 seconds: it ends at the first Tick that reaches 30 seconds after its Start.           |
| CONFIG-2 | A Duel draws 250 Target words once, at its creation; no word is added during the Duel.                                   |
| CONFIG-3 | The Countdown lasts 3 seconds. The server waits 2 seconds after a Game's deadline before applying its final Tick itself. |

## Outcome

| Id        | Rule                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| OUTCOME-1 | The Participant with the higher WPM wins, whatever the Accuracy.                                             |
| OUTCOME-2 | At equal WPM, the Participant with the higher Accuracy wins.                                                 |
| OUTCOME-3 | At equal WPM and equal Accuracy, the Duel is a draw.                                                         |
| OUTCOME-4 | The Outcome is computed once per Participant; the two Outcomes of a Duel are win and loss, or draw and draw. |

## Word draw

| Id      | Rule                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| WORDS-1 | The draw picks common words, each chosen by the random source it is given: no clock, no global random.                        |
| WORDS-2 | The same random source gives the same words: the draw is deterministic.                                                       |
| WORDS-3 | The draw never gives the same word twice in a row, nor a first word equal to the word the drawn words follow, when given one. |
| WORDS-4 | The common words are distinct lowercase words, without any space.                                                             |

## Messages

| Id        | Rule                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| MESSAGE-1 | Every message exchanged over the WebSocket, in either direction, is plain JSON: it passes through JSON unchanged. |
