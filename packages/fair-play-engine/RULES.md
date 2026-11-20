# Fair-play engine rules

This document lists every rule that `@repo/fair-play-engine` applies, with its identifier. Test names reuse these identifiers. The words are those of the "Fair play" section of `GLOSSARY.md`; the reasons are in ADR 0014, ADR 0015 and ADR 0016.

## Configuration

Starting values, held as constants until real Games show how to tune them.

| Id       | Rule                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------- |
| CONFIG-1 | A Player's first Suspension lasts 3 days; every later one lasts 14 days.                                 |
| CONFIG-2 | A Suspension or a Ban voids every ranked Duel the Player won in the 14 days before it, and no older one. |
