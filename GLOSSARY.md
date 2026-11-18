# Typomaniac

Typomaniac is a ranked 1v1 typing duel game. You can play without signing in; signing in lets you keep your results. This glossary fixes the vocabulary of identity, then of typing: what a player types, how it is judged and what is measured, then of ranked play: how a Duel moves a Player's level and Rank.

## Language

### Identity

**Player**:
A signed-in person, whose results are kept and stay attached to them from one visit to the next. A Player without a **Nickname** is signed in but cannot yet save anything or appear publicly.
_Avoid_: User, account, member

**Nickname**:
A **Player**'s public name, which they choose themselves and can change whenever they want. Two Players cannot hold the same one, even with different casing.
_Avoid_: Username, user name, handle, identifier

**Guest**:
A person who plays without having signed in; nothing is kept for them.
_Avoid_: Anonymous, visitor, signed-out user

### Duel

**Duel**:
Any 1v1 between two **Participants**, each playing their own Game on the same Target words and the same Start. A _ranked Duel_ is the rated case, between two Players.
_Avoid_: match, game (reserved for one player's Game), versus, battle, race

**Participant** (`Participant`):
A Player or a Guest taking part in a Duel.
_Avoid_: player (reserved for a signed-in person), contestant, competitor

**Opponent**:
The other Participant of a Duel, seen from one Participant.
_Avoid_: enemy, rival, adversary

**Outcome** (`Outcome`):
What a Duel means for one Participant: `win`, `loss` or `draw`. The higher WPM wins, then the higher Accuracy; otherwise it is a draw. It is decided from the Results, outside the ranked engine.
_Avoid_: result (reserved for a Game's Result), score, verdict, issue

**Countdown**:
The delay between both Participants being connected and the Start of a Duel.
_Avoid_: timer, delay

### Game

**Game** (`Game`):
A single player's typing session, from their first letter to their Result.
_Avoid_: test (reserved for automated tests), round, run

**Result** (`Result`):
What a finished Game produces: its duration and the measures of the player's typing.
_Avoid_: score, points

**Mode**:
What decides the end of a Game: `time` for a fixed duration, `words` for a fixed number of words.

**Target word**:
A word the player must type, Separator included.
_Avoid_: expected word, word to type

**Separator**:
The space that ends a Target word and is typed like a letter.
_Avoid_: trailing space, delimiter

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
The points a ranked Player wins or loses in a Duel within their Division; 100 LP promote to the next Division.
_Avoid_: points, score, league points

**Tier** (`Tier`):
A band of the ladder: `bronze`, `silver`, `gold`, `platinum`, `diamond`, then `master`, the highest.
_Avoid_: league, level, rank (reserved for the full Rank)

**Division** (`Division`):
A step inside a Tier, from IV, the lowest, to I, the highest. Master has no Division.
_Avoid_: sub-tier, step, league

**Rank** (`Rank`):
A ranked Player's visible standing on the ladder: their Tier, their Division (except in Master) and their LP.
_Avoid_: rating, league, level

**Unranked**:
A Player who has no Rank yet, while their Placement is not over.
_Avoid_: unrated, provisional

**Placement**:
A Player's first ranked Duels, during which they are Unranked and their MMR moves faster; the last one gives them their first Rank.
_Avoid_: qualifiers, calibration, placement matches
