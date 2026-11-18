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

| Id      | Rule                                                                                                                                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PLACE-1 | During Placement the Rank stays `null`, the LP delta is 0 and the rank change is `none`.                                                                                                                                                                                                                                        |
| PLACE-2 | On the last Placement Duel, or on any Duel of a Player still Unranked past Placement (such as with 0 Placement Duels), the Rank is the highest Division whose reference MMR (LP-1) is at or below the new MMR, at 0 LP, bounded between Bronze IV and the Placement ceiling. The LP delta is 0 and the rank change is `placed`. |

## LP

The ladder runs from Bronze IV up to Diamond I: each Tier from Bronze to Diamond holds Divisions IV, III, II and I, in that order. Master, a Tier without Division, sits above Diamond I.

| Id   | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LP-1 | A Division's reference MMR is the Bronze IV reference plus its index times the MMR per Division, where the index counts the Divisions below it: 900 for Bronze IV, 950 for Bronze III, up to 1850 for Diamond I by default. In Master, the reference is the Master threshold, one step above Diamond I (1900 by default), plus the MMR per Division for every LP per Division held, rounded down: 50 MMR per 100 LP by default, so 1975 at 150 LP. At a given MMR, the more LP a Master Player holds, the fewer LP they gain and the more they lose. |
| LP-2 | The gap is the new MMR minus the reference, divided by the MMR per LP and truncated toward 0. A win gives the base LP plus the gap, a loss takes the base LP minus the gap, each bounded between the LP bounds. The LP delta is signed.                                                                                                                                                                                                                                                                                                              |
| LP-3 | A draw moves the MMR and leaves the LP unchanged: the LP delta is 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Each of these rules leaves the rank change at `none`, unless a promotion or demotion follows.

## Promotion and demotion

| Id      | Rule                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PROMO-1 | A win that brings the LP to 100 or more moves the Player to the next Division, with the LP beyond 100 carried over: exactly 100 LP promotes at 0 LP. Division I of a Tier leads to Division IV of the next Tier, and Diamond I leads to Master. In Master the LP grow without limit and no promotion happens. There is no promotion series. The LP delta is the gain of LP-2 and the rank change is `promoted`. |
| PROMO-2 | A loss larger than the LP held leaves the Player at 0 LP in the same Division, or in Master. The LP delta reports the LP actually lost: −5 for a loss of 20 at 5 LP.                                                                                                                                                                                                                                            |
| PROMO-3 | A loss at 0 LP moves the Player to the Division below, at the demotion landing (75 LP by default). Division IV of a Tier leads to Division I of the Tier below, and Master leads to Diamond I. The LP delta is the loss of LP-2 and the rank change is `demoted`.                                                                                                                                               |
| PROMO-4 | Bronze IV at 0 LP is the floor: a loss there leaves the Rank unchanged, the LP delta is 0 and the rank change is `none`.                                                                                                                                                                                                                                                                                        |

The LP delta reports the gain or loss applied, never the difference between the LP shown before and after a change of Division.

## Purity

| Id     | Rule                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------ |
| PURE-1 | The input standing is never mutated, the same input gives the same output, and the output passes through JSON unchanged. |
