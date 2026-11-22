# Typomaniac

Typomaniac is a ranked 1v1 typing duel game. You can play without signing in; signing in lets you keep your results. This glossary fixes the vocabulary of identity, then of typing: what a player types, how it is judged and what is measured, then of ranked play: how a Duel moves a Player's level and Rank, and how two Players are brought together for one, then of fair play: how cheating is found and what it costs.

## Language

### Identity

**Player**:
A signed-in person, whose results are kept and stay attached to them from one visit to the next. A Player without a **Nickname** is signed in but cannot yet save anything or appear publicly.
_Avoid_: User, account, member

**Nickname**:
A **Player**'s public name. It starts as their GitHub or Discord username, adapted to the Nickname rules, and they can change it whenever they want. Two Players cannot hold the same one, even with different casing.
_Avoid_: Username, user name, handle, identifier

**Guest**:
A person who plays without having signed in; nothing is kept for them.
_Avoid_: Anonymous, visitor, signed-out user

**Online**:
A **Player** is Online while they have Typomaniac open, on any page and in any number of tabs; each Player counts once. **Guests** are never counted as Online.
_Avoid_: connected, active, present

**Avatar**:
A **Player**'s picture, taken from their GitHub or Discord account when they sign up.
_Avoid_: profile picture, pfp, image

**Friend**:
A **Player** linked to another by a **Friend request** they accepted; the link is mutual, and either of them can undo it. Only Friends can invite each other to a Custom Duel directly.
_Avoid_: buddy, contact, follower, connection

**Friend request**:
A Player's offer to become another Player's **Friend**; it waits until that Player accepts or declines it.
_Avoid_: friend invite, invitation (reserved for a Custom Duel's invite link), add request

**Challenge**:
A Player's offer to an **Online** **Friend** to play a Custom Duel together right away; it lapses if they do not answer it in time. The verb is _challenge_: Alice challenges Bob.
_Avoid_: invitation (reserved for a Custom Duel's invite link), duel request, friendly match, defy

### Duel

**Duel**:
A 1v1 between two **Participants**, played as the best of three **Rounds**: the first to win two Rounds wins the Duel. A _ranked Duel_ is the rated case, between two Players; a **Custom Duel** is the unrated one.
_Avoid_: match, game (reserved for one player's Game), series, versus, battle, race

**Round**:
One leg of a Duel, in which each Participant plays their own Game on the same Target words and the same Start.
_Avoid_: game (reserved for one player's Game), set, heat, match

**Round score**:
The Rounds each Participant has won so far in a Duel, such as 1-0. A drawn Round counts for neither.
_Avoid_: score alone (which says neither of what nor between whom), sets, Points (reserved for what a Game of a Duel is worth)

**Custom Duel**:
An unrated Duel, created by a Participant and joined through its invite link; Guests may take part.
_Avoid_: private duel, friendly, lobby, unranked duel

**Participant** (`Participant`):
A Player or a Guest taking part in a Duel.
_Avoid_: player (reserved for a signed-in person), contestant, competitor

**Opponent**:
The other Participant of a Duel, seen from one Participant.
_Avoid_: enemy, rival, adversary

**Points**:
What a Participant's Game in a Duel is worth, an integer: `round(WPM × (Accuracy / 100)² × 10 × M)`, so Accuracy counts twice, where M is the average **Multiplier** of the Game's validated words, 1 when none is validated. Nothing typed is worth 0 Points. Points belong to a Duel, not to a Game's measures: a Practice Game has none.
_Avoid_: score, LP (reserved for ranked progression), Round score (reserved for Rounds won)

**Perfect word**:
A validated Target word typed without a single incorrect Keystroke, even a corrected one, and without any Missed letter.
_Avoid_: clean word, flawless word

**Streak**:
The Perfect words a Participant has validated in a row in a Game; a word that is not a Perfect word ends it, and every Game starts without one.
_Avoid_: combo, chain, run

**Multiplier**:
What a validated word weighs in a Game's Points: 1 for a word that is not a Perfect word, otherwise 1 for the first word of a Streak, rising by 0.02 with each Perfect word after it, up to 1.10.
_Avoid_: combo, bonus, boost

**Lead**:
The difference in Points between the two Participants of a Round, held by the one with more; with equal Points, nobody leads.
_Avoid_: advantage, margin, gap, difference

**Outcome** (`Outcome`):
What a Round or a Duel means for one Participant: `win`, `loss` or `draw`. A Round goes to the Participant with more Points; equal Points make it a draw, with no tie-break. A Duel goes to whoever won more Rounds; otherwise it is a draw.
_Avoid_: result (reserved for a Game's Result), score, verdict, issue

**Countdown**:
The delay that precedes the Start of each Round.
_Avoid_: timer, delay

### Game

**Game** (`Game`):
A single player's typing session, from their first letter to their Result.
_Avoid_: test (reserved for automated tests), run

**Result** (`Result`):
What a finished Game produces: its duration and the measures of the player's typing.
_Avoid_: score

**Mode**:
What decides the end of a Game: `time` for a fixed duration, `words` for a fixed number of words.

**Target word**:
A word the player must type, Separator included.
_Avoid_: expected word, word to type

**Separator**:
The space that ends a Target word and is typed like a letter.
_Avoid_: trailing space, delimiter

**Missed letter**:
A letter of a Target word left untyped when its word is validated; shown as a mistake, like an incorrect one.
_Avoid_: skipped letter

**Practice**:
A Game played on its own, outside any Duel, to train; nothing is kept for it, and it is worth no Points.
_Avoid_: training, solo mode, warm-up

### Events

**Event** (`GameEvent`):
What is applied to a Game to make it advance: a player action or a time signal.
_Avoid_: action, message

**Keystroke** (`Keystroke`):
A character inserted by the player, judged correct or incorrect.
_Avoid_: input, entry

**KeyPress** (`KeyPress`):
The player's physical gesture on a keyboard key, from the moment it goes down to the moment it is released. Unlike a Keystroke, it writes nothing and is not judged: it describes the rhythm of the typing, not its content.
_Avoid_: press, key stroke

**Start** (`start`):
The Event that starts a Game's clock at a shared signal, instead of at the player's first Keystroke.
_Avoid_: go, launch

**Tick** (`tick`):
A timer Event that tells a Game that time has passed.
_Avoid_: beat

### Measures

**WPM**:
The player's speed in words per minute, counted on exactly typed words only; a word is 5 characters.
_Avoid_: net speed, words/min

**Raw WPM**:
The player's speed in words per minute, counted on everything typed, mistakes included.
_Avoid_: raw, gross speed

**Accuracy**:
The share of correct Keystrokes among all Keystrokes, as a percentage; a corrected mistake remains a mistake.
_Avoid_: precision, exactness

**Consistency**:
How steady the player's speed is over the course of the Game, as a percentage.
_Avoid_: regularity

**Key consistency**:
How steady the time between the player's successive KeyPresses is, as a percentage.
_Avoid_: Keystroke consistency

**Inactivity**:
The time in a Game during which the player is not typing.
_Avoid_: AFK, pause

**WPM history**:
The WPM reached at the end of each second of a Game, counted from its start. The Result holds the final one; it can also be read live, while the Game is played.
_Avoid_: speed curve, WPM series

**Live stats** (`LiveStats`):
The WPM, Raw WPM and Accuracy read while a Game is being played, as opposed to its Result.
_Avoid_: live result, current stats

### Ranked

**MMR**:
A Player's hidden level estimate, an integer moved by Elo after each Duel, which matchmaking reads.
_Avoid_: Elo, rating, score

**LP**:
What a ranked Player wins or loses in a Duel within their Division; 100 LP promote to the next Division.
_Avoid_: Points (reserved for what a Game of a Duel is worth), score, league points

**Tier** (`Tier`):
A band of the ladder: `bronze`, `silver`, `gold`, `platinum`, `diamond`, then `master`, the highest.
_Avoid_: league, level, rank (reserved for the full Rank)

**Division** (`Division`):
A step inside a Tier, from IV, the lowest, to I, the highest. Master has no Division.
_Avoid_: sub-tier, step, league

**Promotion**:
A ranked Player's Rank going up one Division at 100 LP; from Division I it goes to Division IV of the next Tier, and from Diamond I to Master.
_Avoid_: rank up, level up

**Tier promotion**:
A Promotion that changes the Tier, from Division I of one Tier to the next Tier.
_Avoid_: tier up, rank up, ascension

**Rank** (`Rank`):
What a ranked Player sees and climbs on the ladder: their Tier, their Division (except in Master) and their LP.
_Avoid_: rating, league, level, standing (reserved for the full Standing)

**Standing**:
A Player's ranked state: their MMR, the number of ranked Duels they have played and their Rank.
_Avoid_: rank (reserved for its visible part), rating, record, stats, profile

**Unranked**:
A Player who has no Rank yet, while their Placement is not over.
_Avoid_: unrated, provisional

**Placement**:
A Player's first ranked Duels, during which they are Unranked and their MMR moves faster; the last one gives them their first Rank.
_Avoid_: qualifiers, calibration, placement matches

**Leaderboard**:
The public list of ranked Players, ordered by Rank.
_Avoid_: ladder (reserved for the scale of Tiers and Divisions), ranking, standings, top

**Position**:
The place of a ranked Player on the Leaderboard, counted from 1; no two Players share one.
_Avoid_: place, rank (reserved for the Rank), spot

**Podium**:
The first three Positions of the Leaderboard.
_Avoid_: top 3, top

**Peak Tier**:
The highest Tier a Player has ever reached; a demotion does not lower it.
_Avoid_: best rank, max tier, highest rank

**Ornament** (`Ornament`):
What a Player wears around their Avatar, drawn for a Tier. By default it follows their Rank, Division included; they can instead pin the Unranked plate or the Ornament of any Tier up to their Peak Tier, or wear none. A pinned Tier shows the Player's Division when it is their current Tier, and its Tier alone otherwise.
_Avoid_: frame, border, RankFrame, emblem, badge (reserved for the Tier badge)

### Progress

**Progress**:
How a Player's measures and Rank have moved over the Games and Duels they have played, ranked and Custom alike; Practice Games, of which nothing is kept, are not part of it. Anyone can see a Player's Progress.
_Avoid_: stats, history (reserved for the WPM history of a Game), career, record

### Matchmaking

**Queue**:
Where a Player waits to be paired for a ranked Duel.
_Avoid_: lobby, pool, waiting room, search

**Pairing**:
Two queued Players proposed to each other; it becomes a ranked Duel once both accept. The verb is _pair_: the Queue pairs two Players.
_Avoid_: match, matchup, proposal, invitation

### Fair play

**Violation**:
An Event that the game itself cannot produce, received from a Participant in a ranked Duel; it is refused, and it is proof that their Game was not played with the game as it is.
_Avoid_: exploit, hack, illegal event, invalid input

**Suspicion**:
How strongly a Player's ranked Games look like they were not typed by a person; it proves nothing by itself and only calls for a Review.
_Avoid_: cheat score, risk, flag, trust

**Review**:
A person's examination of a Player under Suspicion, which ends by clearing them or by a Sanction.
_Avoid_: audit, moderation, investigation

**Administrator**:
The Player who settles Reviews: a mark set by hand in the database, checked by the server on every administration route.
_Avoid_: admin, moderator, staff

**Report**:
A Player's statement, made at the end of a ranked Duel, that their Opponent cheated in it; it raises that Opponent's Suspicion and never sanctions by itself.
_Avoid_: complaint, flag, ticket

**Sanction**:
What is applied to a Player for cheating: a **Voided Duel**, a **Suspension** or a **Ban**, in rising order.
_Avoid_: penalty, punishment, strike

**Voided Duel**:
A ranked Duel whose effect on both Standings is withdrawn where the cheating paid: the Player at fault loses what they won in it, and their Opponent gets back what they lost. A Duel the Player at fault lost stays as it was.
_Avoid_: cancelled duel, annulled duel, reverted duel, refund

**Suspension**:
A Sanction that keeps a Player out of the Queue for a set time; they can still sign in, play Practice and Custom Duels, and keep their Friends, challenge and be challenged.
_Avoid_: timeout, temporary ban, cooldown

**Ban**:
A permanent Sanction: the Player can no longer sign in, and the GitHub and Discord accounts and the e-mail they signed in with can never be used to sign in again. Their Friends and Friend requests are deleted and their waiting Challenges cancelled; lifting the Ban brings none of them back.
_Avoid_: permanent suspension, block, exclusion
