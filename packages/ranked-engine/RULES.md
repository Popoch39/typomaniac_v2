# Ranked engine rules

This document lists every rule that `@repo/ranked-engine` applies, with its identifier. Test names reuse these identifiers. The choice of a hidden MMR with a visible Rank is recorded in ADR 0006.

## Configuration

Every constant lives in `RankedConfig`. `DEFAULT_RANKED_CONFIG` holds the defaults below, which are starting points to tune once real Duels exist; `createStanding` and `applyDuel` use them when no configuration is given.

| Key                | Default     | Meaning                                                                                                   |
| ------------------ | ----------- | --------------------------------------------------------------------------------------------------------- |
| `initialMmr`       | 1200        | MMR of a new Player.                                                                                      |
| `kFactor`          | 32          | K-factor once Placement is over.                                                                          |
| `placementKFactor` | 64          | K-factor during Placement.                                                                                |
| `placementDuels`   | 5           | Number of Placement Duels.                                                                                |
| `bronzeIvMmr`      | 900         | Reference MMR of Bronze IV.                                                                               |
| `mmrPerDivision`   | 50          | MMR between the references of two consecutive Divisions; Master starts one step above Diamond I, at 1900. |
| `lpPerDivision`    | 100         | LP that promote to the next Division.                                                                     |
| `baseLp`           | 20          | LP won or lost when the MMR equals the reference.                                                         |
| `minLp`, `maxLp`   | 10, 30      | Bounds of an LP gain or loss.                                                                             |
| `mmrPerLp`         | 5           | MMR of gap to the reference that adds or removes 1 LP.                                                    |
| `demotionLp`       | 75          | LP held right after a demotion.                                                                           |
| `placementCeiling` | Platinum IV | Highest Division a Placement can give.                                                                    |

## MMR

| Id    | Rule                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MMR-1 | The expected score is `1 / (1 + 10^((opponentMmr − mmr) / 400))`.                                                                                                                                 |
| MMR-2 | The new MMR is `mmr + round(K × (score − expected))`, with score 1 for a win, 0.5 for a draw and 0 for a loss. The MMR is an integer and never goes below 0: the MMR delta is the change applied. |
| MMR-3 | K is the Placement K-factor while the Player has played fewer Duels than the Placement length, the regular K-factor afterwards.                                                                   |

Each update increments the number of Duels played by one. The update of a Player depends only on their own standing, the opponent's MMR and the Outcome: the two updates of a Duel are independent, so their MMR deltas do not necessarily sum to zero.

## Placement

| Id      | Rule                                                                                     |
| ------- | ---------------------------------------------------------------------------------------- |
| PLACE-1 | During Placement the Rank stays `null`, the LP delta is 0 and the rank change is `none`. |

Until the Placement gives a Rank, a Player who has finished Placement stays Unranked: only their MMR keeps moving, with the regular K-factor.

## Purity

| Id     | Rule                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------ |
| PURE-1 | The input standing is never mutated, the same input gives the same output, and the output passes through JSON unchanged. |
