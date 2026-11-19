# Typomaniac

Typomaniac is a ranked 1v1 typing duel game. You can play without signing in; signing in lets you keep your results. This glossary fixes the vocabulary of identity, then of typing: what a player types, how it is judged and what is measured, then of ranked play: how a Duel moves a Player's level and Rank, and how two Players are brought together for one.

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

**Avatar**:
A **Player**'s picture, taken from their GitHub or Discord account when they sign up.
_Avoid_: profile picture, pfp, image

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
What a Participant's Game in a Duel is worth, an integer: `round(WPM × (Accuracy / 100)² × 10)`, so Accuracy counts twice. Nothing typed is worth 0 Points. Points belong to a Duel, not to a Game's measures: a Practice Game has none.
_Avoid_: score, LP (reserved for ranked progression), Round score (reserved for Rounds won)

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

**Peak Tier**:
The highest Tier a Player has ever reached; a demotion does not lower it.
_Avoid_: best rank, max tier, highest rank

**Ornament** (`Ornament`):
What a Player wears around their Avatar, drawn for a Tier. By default it follows their Rank, Division included; they can instead pin the Unranked plate or the Ornament of any Tier up to their Peak Tier, or wear none. A pinned Ornament shows its Tier alone, without a Division.
_Avoid_: frame, border, RankFrame, emblem, badge (reserved for the Tier badge)

### Matchmaking

**Queue**:
Where a Player waits to be paired for a ranked Duel.
_Avoid_: lobby, pool, waiting room, search

**Pairing**:
Two queued Players proposed to each other; it becomes a ranked Duel once both accept. The verb is _pair_: the Queue pairs two Players.
_Avoid_: match, matchup, proposal, invitation
