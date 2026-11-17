# Règles du moteur de frappe

Ce document liste chaque règle que `@repo/typing-engine` applique, avec son identifiant et la fonction de Monkeytype dont elle vient. Les noms des tests reprennent ces identifiants.

## Référence

- Monkeytype au commit `66cda5ca1b138bd786d3c7c43a8ae606da98978e`. Les chemins ci-dessous partent de `frontend/src/ts/` dans ce dépôt, sauf mention contraire.
- Monkeytype est sous GPL-3.0. Ce paquet décrit ses règles et les réécrit de zéro : ni son code ni ses tests ne sont copiés (voir l'ADR 0003).
- Une règle marquée « Typomaniac » n'a pas de source dans Monkeytype : elle vient de la forme du moteur.

## Réglages par défaut de Monkeytype

Le moteur applique les réglages par défaut de Monkeytype et n'en expose aucun. Valeurs relues dans `constants/default-config.ts` au commit de référence :

| Réglage           | Clé              | Défaut     | Effet du défaut sur les règles                                                                                                                                   |
| ----------------- | ---------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fin rapide        | `quickEnd`       | `false`    | Le dernier mot ne termine pas la Partie dès qu'il atteint la longueur de la cible : il faut qu'il soit exact, ou qu'un Séparateur le valide (`checkIfFinished`). |
| Espace strict     | `strictSpace`    | `false`    | Un espace sur une saisie vide est refusé avant insertion (`onBeforeInsertText`) : il ne saute pas le mot et ne compte pas comme une faute.                       |
| Arrêt sur erreur  | `stopOnError`    | `"off"`    | Une insertion incorrecte reste dans la saisie, et un espace valide un mot même faux (`shouldGoToNextWord`).                                                      |
| Mode confiance    | `confidenceMode` | `"off"`    | Le retour arrière n'est jamais bloqué par ce mode (`onBeforeDelete`).                                                                                            |
| Mode liberté      | `freedomMode`    | `false`    | Le retour au mot précédent reste réservé à un mot précédent incorrect (`onBeforeDelete`).                                                                        |
| Difficulté        | `difficulty`     | `"normal"` | Aucune faute ne fait échouer la Partie (`checkIfFailedDueToDifficulty`), et l'espace sur une saisie vide reste refusé.                                           |
| Suppression/faute | `deleteOnError`  | `"off"`    | Relevé parce que `checkIfFinished` et `shouldGoToNextWord` en dépendent : aucune suppression automatique après une faute.                                        |

Aucune de ces valeurs ne contredit la spec. `quickEnd` à `false` ne retarde pas la fin d'une Partie sans faute : `checkIfFinished` termine la Partie dès que la saisie du dernier mot est exactement ce mot, quel que soit ce réglage.

## Partie

| Id     | Règle                                                                                                                                                 | Source                                                                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GAME-1 | Une Partie expose ses Mots cibles, la saisie de chaque mot, l'index du mot actif et son statut (`ready`, `running`, `finished`).                      | Typomaniac                                                                                                                                                        |
| GAME-2 | En Mode `words`, la Partie garde les premiers mots de la liste, à hauteur du nombre de mots demandé.                                                  | `test/words-generator.ts` → `getLimit`, `areAllWordsGenerated`                                                                                                    |
| GAME-3 | Créer une Partie `words` est refusé si le nombre de mots n'est pas un entier strictement positif ou si la liste contient moins de mots que ce nombre. | Typomaniac (le Mode `words` sans fin de Monkeytype, `words = 0`, est hors périmètre)                                                                              |
| SEP-1  | Chaque Mot cible porte un espace comme Séparateur, sauf le dernier d'une Partie `words`.                                                              | `test/words-generator.ts` → `appendCommitCharacter` ; `test/test-words.ts` → `Words.removeCommitCharacterFromLastWord`, appelée par `test/test-logic.ts` → `init` |
| PURE-1 | Appliquer un Événement ne modifie jamais la Partie reçue : la fonction rend une nouvelle Partie.                                                      | Typomaniac                                                                                                                                                        |

## Saisie

| Id      | Règle                                                                                                                                                                                                                                            | Source                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| START-1 | Sans Départ, l'horloge démarre à la première insertion de texte, à l'horodatage de cette insertion.                                                                                                                                              | `input/handlers/insert-text.ts` → `onInsertText` (appel de `TestLogic.startTest(now)`)                                      |
| INS-1   | Une insertion correcte, c'est-à-dire le caractère attendu à cette position du Mot cible, s'ajoute à la saisie du mot actif.                                                                                                                      | `input/helpers/validation.ts` → `isCharCorrect`                                                                             |
| INS-2   | Le Séparateur attendu en fin de mot valide le mot : il s'ajoute à la saisie, et le mot suivant devient le mot actif.                                                                                                                             | `input/helpers/validation.ts` → `shouldGoToNextWord` ; `input/helpers/word-navigation.ts` → `goToNextWord`                  |
| INS-3   | Une insertion de plusieurs caractères est appliquée caractère par caractère, tous au même horodatage.                                                                                                                                            | `input/handlers/insert-text.ts` → `onInsertText` (branche `data.length > 1`)                                                |
| INS-4   | Une insertion qui n'est pas le caractère attendu à cette position du Mot cible, Séparateur compris, est incorrecte et reste dans la saisie. Au-delà de la cible, toute insertion est incorrecte.                                                 | `input/helpers/validation.ts` → `isCharCorrect`                                                                             |
| INS-5   | Un espace sur une saisie vide est refusé : la Partie ne change pas, l'horloge ne démarre pas et aucune Frappe n'est enregistrée.                                                                                                                 | `input/handlers/before-insert-text.ts` → `onBeforeInsertText`                                                               |
| INS-6   | Un espace sur une saisie non vide valide le mot, juste, faux ou incomplet : il s'ajoute à la saisie et le mot suivant devient le mot actif. Il est jugé comme toute insertion : correct s'il tombe à la position du Séparateur, incorrect sinon. | `input/helpers/validation.ts` → `shouldGoToNextWord`, `isCharCorrect` ; `input/helpers/word-navigation.ts` → `goToNextWord` |
| INS-7   | La saisie d'un mot est plafonnée à la longueur du Mot cible, Séparateur compris, plus 20. Au plafond, une insertion est refusée sans laisser de Frappe, sauf l'espace, qui valide toujours le mot.                                               | `input/handlers/before-insert-text.ts` → `onBeforeInsertText`                                                               |
| INS-8   | Les 14 caractères d'espace reconnus (liste ci-dessous) sont remplacés par un espace ordinaire avant d'être jugés : la saisie et le journal des Frappes ne contiennent que U+0020. Tout autre blanc est un caractère ordinaire.                   | `utils/strings.ts` → `isSpace` ; `input/helpers/util.ts` → `normalizeData`, `getCommitCharacterType`                        |

Caractères d'espace reconnus (INS-8) : U+0020, U+00A0, U+1680, U+2002, U+2003, U+2004, U+2007, U+2008, U+2009, U+200A, U+200B, U+202F, U+3000, U+FEFF. U+2000, U+2001, U+2005, U+2006, U+205F, la tabulation et le retour à la ligne n'en font pas partie.

Mot actif : pendant la Partie, Monkeytype tient un compteur que `goToNextWord` incrémente à chaque validation d'un mot qui a un suivant ; `test/events/stats.ts` → `inferActiveWordIndex` retrouve la même valeur à partir du journal. Le moteur tient ce compteur dans la Partie (GAME-1, INS-6).

Écarts connus sur la saisie :

- `normalizeData` remplace aussi un caractère « visuellement égal » au caractère attendu (familles d'apostrophes, de guillemets, de tirets et de virgules) par ce caractère, et `onInsertText` développe le caractère points de suspension en trois points. La spec n'en parle pas : le moteur ne le fait pas.
- `onBeforeInsertText` refuse un retour à la ligne quand les mots n'en contiennent pas. Le moteur le juge comme un caractère ordinaire, donc incorrect.

## Corrections

Une suppression porte sur un caractère ou sur un mot. Les deux suivent la même condition pour revenir au mot précédent : `onBeforeDelete` ne regarde pas le type de suppression. Point relu au commit de référence, comme la spec le demandait.

| Id    | Règle                                                                                                                                                                                                                                                         | Source                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| DEL-1 | La suppression d'un caractère retire le dernier caractère de la saisie du mot actif.                                                                                                                                                                          | `input/handlers/delete.ts` → `onDelete` ; `test/events/helpers.ts` → `applyInputEvent`                                       |
| DEL-2 | Sur le premier mot avec une saisie vide, une suppression, de caractère ou de mot, est ignorée.                                                                                                                                                                | `input/handlers/before-delete.ts` → `onBeforeDelete`                                                                         |
| DEL-3 | Sur une saisie vide, la suppression d'un caractère revient au mot précédent s'il est incorrect, c'est-à-dire si sa saisie diffère de son Mot cible, Séparateur compris. Ce mot redevient le mot actif, avec sa saisie sans l'espace final qui l'avait validé. | `input/handlers/before-delete.ts` → `onBeforeDelete` ; `input/helpers/word-navigation.ts` → `goToPreviousWord`               |
| DEL-4 | Sur une saisie vide, une suppression, de caractère ou de mot, est ignorée si le mot précédent a été tapé exactement.                                                                                                                                          | `input/handlers/before-delete.ts` → `onBeforeDelete`                                                                         |
| DEL-5 | La suppression de mot retire de la saisie du mot actif le dernier bloc de caractères non blancs avec les blancs qui le suivent, ou à défaut les blancs finaux.                                                                                                | `test/events/helpers.ts` → `applyInputEvent`                                                                                 |
| DEL-6 | Sur une saisie vide, la suppression de mot revient au mot précédent à la même condition que DEL-3, et vide sa saisie.                                                                                                                                         | `input/handlers/before-delete.ts` → `onBeforeDelete` ; `input/helpers/word-navigation.ts` → `goToPreviousWord`               |
| DEL-7 | Une suppression n'ajoute aucune Frappe au journal et n'en retire aucune.                                                                                                                                                                                      | `input/handlers/delete.ts` → `onDelete` (la suppression est un événement à part, les insertions du journal restent en place) |
| DEL-8 | Une Frappe incorrecte puis effacée compte toujours comme incorrecte dans la Précision (ACC-1) : les suppressions n'y comptent pas.                                                                                                                            | `test/events/stats.ts` → `getAccuracy`                                                                                       |
| DEL-9 | Le décompte des caractères (CHARS-1 à CHARS-5) porte sur la saisie finale de chaque mot : un mot corrigé puis validé exactement compte dans le WPM (RES-2).                                                                                                   | `test/events/stats.ts` → `getChars`, `countCharsForWordIndex`                                                                |

Une suppression appliquée à une Partie finie ne la modifie pas (END-2) ; `onBeforeDelete` la refuse aussi tant que la Partie n'a pas commencé, ce que DEL-2 couvre déjà puisque la saisie est alors vide sur le premier mot. Une suppression ne fait pas démarrer l'horloge et ne la remet pas à zéro.

Mot actif après un retour : `goToPreviousWord` décrémente le compteur de Monkeytype ; le moteur fait de même avec l'index du mot actif (GAME-1).

Écarts connus sur les corrections :

- Dans Monkeytype, c'est le navigateur qui décide de ce qu'une suppression de mot retire de la saisie en direct ; `applyInputEvent` en est le modèle pur, que DEL-5 suit. Avec les réglages par défaut, un espace reconnu (INS-8) valide toujours le mot : seul un blanc hors de cette liste, comme la tabulation, peut se trouver dans une saisie.
- `onBeforeDelete` refuse le retour vers un mot précédent qui n'est plus affiché. C'est une règle de mise en page, hors périmètre : le front l'applique en n'émettant pas l'Événement.
- Monkeytype n'enregistre pas de Frappe pour une suppression mais la garde dans son journal d'événements, avec la saisie qui en résulte. Le journal public du moteur ne contient que les insertions (KEY-1).

## Journal des Frappes

| Id    | Règle                                                                                                                                                                                                                                  | Source                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| KEY-1 | La Partie expose le journal de ses Frappes : une entrée par insertion jugée, avec son instant, l'index du mot, la position dans le mot (la longueur de la saisie avant l'insertion), le caractère après INS-8 et si elle est correcte. | `input/handlers/insert-text.ts` → `onInsertText` (appel de `logTestEvent`) |
| KEY-2 | Une insertion refusée (INS-5, INS-7) ne laisse aucune entrée dans le journal.                                                                                                                                                          | `input/handlers/before-insert-text.ts` → `onBeforeInsertText`              |

Écart connu sur KEY-1 : Monkeytype horodate une Frappe par rapport au début de la Partie. Le moteur garde l'horodatage du client porté par l'Événement, comme pour le début et la fin de la Partie.

## Fin de Partie

| Id    | Règle                                                                                                                                                                                           | Source                                                                                                                  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| END-1 | En Mode `words`, la Partie se termine dès que la saisie du dernier mot est exactement ce mot, sans espace final. L'instant de fin est celui de l'insertion.                                     | `input/helpers/fail-or-finish.ts` → `checkIfFinished`                                                                   |
| END-2 | Un Événement appliqué à une Partie finie ne la modifie pas, y compris les caractères d'une insertion qui suivent celui qui termine la Partie.                                                   | `input/handlers/before-insert-text.ts` → `onBeforeInsertText` (`isResultCalculating`)                                   |
| END-3 | En Mode `words`, un espace sur le dernier mot, faux ou incomplet mais non vide, termine la Partie à l'instant de cet espace. L'espace est retiré de la saisie mais reste une Frappe incorrecte. | `input/helpers/fail-or-finish.ts` → `checkIfFinished` ; `test/events/helpers.ts` → `applyInputEvent`, `getInputFromDom` |

Écart connu sur END-1 : Monkeytype horodate la fin par un nouvel appel à `performance.now()` dans `test/test-logic.ts` → `finish`, quelques fractions de milliseconde après la dernière insertion. Le moteur n'a pas d'horloge : il prend l'horodatage de l'insertion qui termine la Partie.

## Résultat

| Id    | Règle                                                                                                                                                                             | Source                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| RES-1 | La durée est l'écart entre le départ et la fin, en secondes, arrondie à 2 décimales.                                                                                              | `test/events/stats.ts` → `getTestDurationMs` ; `packages/util/src/numbers.ts` → `roundTo2`                             |
| RES-2 | Le WPM vaut les caractères des mots tapés exactement, Séparateurs compris, divisés par 5 puis par la durée arrondie en minutes. Il est arrondi à 2 décimales.                     | `utils/numbers.ts` → `calculateWpm` ; `utils/strings.ts` → `countChars` ; `test/test-logic.ts` → `buildCompletedEvent` |
| RES-3 | Le WPM brut porte sur les caractères corrects, incorrects et en trop (CHARS-1 à CHARS-4), avec la même formule et le même arrondi. Il est égal au WPM pour une Partie sans faute. | `utils/numbers.ts` → `calculateWpm` ; `test/test-logic.ts` → `buildCompletedEvent`                                     |
| RES-4 | Le WPM et le WPM brut valent 0 si la durée est nulle ou négative.                                                                                                                 | `utils/numbers.ts` → `calculateWpm`                                                                                    |
| RES-5 | Demander le Résultat d'une Partie non finie est refusé par une erreur.                                                                                                            | Typomaniac                                                                                                             |
| ACC-1 | La Précision vaut les Frappes correctes sur le total des Frappes (KEY-1), en pourcentage arrondi à 2 décimales. Une insertion refusée n'est pas une Frappe et n'y compte pas.     | `test/events/stats.ts` → `getAccuracy` ; `test/test-logic.ts` → `buildCompletedEvent`                                  |

## Décompte des caractères

Le Résultat compare chaque mot à son Mot cible, position par position, jusqu'au plus long de la saisie et de la cible. Source commune : `test/events/stats.ts` → `getChars`, `countCharsForWordIndex` ; `utils/strings.ts` → `countChars`.

| Id      | Règle                                                                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CHARS-1 | Un caractère identique à celui de la cible à sa position est correct. Si la saisie du mot est exactement le Mot cible, ses caractères, Séparateur compris, sont aussi comptés comme caractères des mots tapés exactement. |
| CHARS-2 | Un caractère différent de celui de la cible à sa position est incorrect.                                                                                                                                                  |
| CHARS-3 | Le Séparateur d'un mot faux est incorrect, même tapé à sa position.                                                                                                                                                       |
| CHARS-4 | Un caractère tapé au-delà de la cible est en trop, l'espace qui valide le mot compris. Une lettre tapée à la position du Séparateur d'un mot validé est incorrecte.                                                       |
| CHARS-5 | Une position de la cible sans caractère tapé est manquée : fin d'un mot validé trop tôt, mot sauté, dernier mot inachevé d'une Partie `words`.                                                                            |

Écarts connus sur le décompte :

- La Précision et le décompte ne jugent pas l'espace d'un mot faux de la même façon : tapé à la position du Séparateur, il est une Frappe correcte (INS-6) mais un caractère incorrect (CHARS-3). C'est le comportement de Monkeytype.
- `countChars` compte en trop, et non incorrecte, une lettre tapée à la position du Séparateur d'un mot non validé, et en trop un espace correct qui n'a pas validé le mot. Le premier cas est atteignable sur le mot actif d'une Partie `time` : c'est CHARS-8. Le second ne l'est pas, puisqu'un espace sur une saisie non vide valide toujours le mot (INS-6) : le moteur ne le code pas.

## Mode `time`

Les règles ci-dessus valent dans les deux Modes, sauf SEP-1, END-1 et END-3 qui portent sur le dernier mot d'une Partie `words` : une Partie `time` n'a pas de dernier mot.

| Id     | Règle                                                                                                                                                                                         | Source                                                                                              |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| GAME-4 | En Mode `time`, la Partie se crée avec une durée en secondes et garde tous les mots de la liste.                                                                                              | `test/test-timer.ts` → `checkIfTimeIsUp` (`Config.time`)                                            |
| GAME-5 | Créer une Partie `time` est refusé si la durée n'est pas un nombre fini strictement positif.                                                                                                  | Typomaniac (le Mode `time` sans fin de Monkeytype, `time = 0`, est hors périmètre)                  |
| SEP-2  | En Mode `time`, tous les Mots cibles portent un Séparateur, y compris le dernier de la liste courante et les mots ajoutés.                                                                    | `test/words-generator.ts` → `areAllWordsGenerated`, `appendCommitCharacter`                         |
| ADD-1  | Un ajout de mots allonge la liste des Mots cibles, avec une saisie vide par mot ajouté. Il ne touche ni aux saisies, ni au mot actif, ni au statut, ni à l'horloge, ni au journal.            | `test/test-logic.ts` → `addWord` ; `test/test-words.ts` → `Words.push`                              |
| ADD-2  | En Mode `words`, un ajout de mots est ignoré : le dernier mot n'a pas de Séparateur, rien ne peut le suivre.                                                                                  | Typomaniac                                                                                          |
| ADD-3  | En Mode `time`, valider le dernier mot disponible ne termine pas la Partie : le mot actif passe au-delà de la liste, et toute insertion est refusée sans Frappe jusqu'à un ajout de mots.     | Typomaniac, d'après `input/helpers/word-navigation.ts` → `goToNextWord` (voir l'hypothèse plus bas) |
| TICK-1 | Un Tic reçu avant que l'horloge ait démarré ne démarre ni ne termine la Partie.                                                                                                               | `test/test-logic.ts` → `startTest` (la minuterie n'existe qu'une fois la Partie démarrée)           |
| TICK-2 | En Mode `time`, un Tic dont le temps écoulé depuis le départ n'atteint pas la limite ne change pas la Partie.                                                                                 | `test/test-timer.ts` → `timerStep`, `checkIfTimeIsUp`                                               |
| TICK-3 | En Mode `words`, un Tic ne termine jamais la Partie.                                                                                                                                          | `test/test-timer.ts` → `checkIfTimeIsUp`                                                            |
| END-4  | En Mode `time`, la Partie se termine au premier Tic dont le temps écoulé depuis le départ atteint la limite. L'instant de fin est celui de ce Tic : la durée (RES-1) peut dépasser la limite. | `test/test-timer.ts` → `timerStep`, `checkIfTimeIsUp`, `clear` ; `test/test-logic.ts` → `finish`    |
| END-5  | Les Frappes arrivées après la limite mais avant le Tic qui termine la Partie comptent dans la saisie, le journal et le Résultat.                                                              | `test/events/data.ts` → `cleanupData`                                                               |

Décompte des caractères d'une Partie `time`, même source commune que CHARS-1 à CHARS-5 :

| Id      | Règle                                                                                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CHARS-6 | En Mode `time`, les caractères non tapés du mot actif ne sont pas manqués, et si sa saisie est un début correct du Mot cible, ses caractères sont comptés comme caractères des mots tapés exactement, donc dans le WPM.    |
| CHARS-7 | En Mode `time`, un mot actif dont la saisie n'est pas un début correct du Mot cible n'apporte aucun caractère au WPM, pas même ses premières lettres justes. Ses caractères comptent dans le WPM brut comme ceux d'un mot. |
| CHARS-8 | Une lettre tapée à la position du Séparateur d'un mot qu'aucun espace n'a validé est en trop, et non incorrecte comme pour un mot validé (CHARS-4).                                                                        |
| CHARS-9 | Les mots situés après le mot actif ne sont pas comptés : aucun de leurs caractères n'est manqué.                                                                                                                           |

Hypothèse sur ADD-3 : Monkeytype garde une centaine de mots générés devant le mot actif, donc le mot actif n'y est jamais le dernier de la liste en Mode `time`. Le moteur reçoit ses mots par un Événement, donc le cas peut arriver. `goToNextWord` bloque alors la saisie en attendant le mot suivant : le moteur refuse de même les insertions, sans Frappe et sans démarrer l'horloge, et l'appelant est censé ajouter des mots avant d'en arriver là. Le mot validé garde son espace dans la saisie et se compte comme tout mot validé.

Écarts connus sur le Mode `time` :

- Monkeytype compte ses Tics sur une grille d'une seconde ancrée au départ et termine la Partie au Tic dont le numéro atteint la limite. Un Tic n'y est jamais traité avant son instant de grille : c'est le même instant que « le premier Tic dont le temps écoulé atteint la limite » (END-4). Le moteur ne compte pas les Tics, il compare l'horodatage du Tic au départ.
- Monkeytype horodate la fin par `performance.now()` dans `finish`. Le moteur prend l'horodatage du Tic qui termine la Partie.

## Départ au signal

Le Départ est un ajout propre à Typomaniac : Monkeytype ne connaît que le démarrage à la première insertion (START-1), qui reste le comportement par défaut. Il sert au duel, où les deux joueurs sont chronométrés depuis le même signal et où le temps de réaction compte. Les sources citées ci-dessous sont les fonctions de Monkeytype qui ancrent leurs calculs à l'instant de départ : le Départ ne fait que déplacer cet instant.

| Id       | Règle                                                                                                                                                                                                                                             | Source                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| START-2  | Un Départ appliqué à une Partie qui n'a pas commencé fait partir l'horloge à son horodatage : la Partie passe au statut `running`, sans Frappe et sans toucher aux saisies.                                                                       | Typomaniac                                                                                            |
| START-3  | Après un Départ, la première insertion ne redémarre pas l'horloge : le temps écoulé avant la première lettre compte dans la durée (RES-1), donc dans le WPM et le WPM brut (RES-2, RES-3).                                                        | Typomaniac, d'après `test/events/stats.ts` → `getTestDurationMs`                                      |
| START-4  | En Mode `time`, la limite se compte depuis le Départ quand il est présent (TICK-2, END-4).                                                                                                                                                        | Typomaniac, d'après `test/test-timer.ts` → `checkIfTimeIsUp`                                          |
| START-5  | Un Départ reçu alors que la Partie a déjà commencé, par une insertion ou par un premier Départ, ou qu'elle est finie, est ignoré.                                                                                                                 | Typomaniac                                                                                            |
| RES-6    | Une Partie finie sans aucune Frappe, ce qui n'arrive qu'en Mode `time` après un Départ, a un Résultat : la Précision vaut 0 et le décompte des caractères est nul, même sans aucun Mot cible.                                                     | `test/test-logic.ts` → `buildCompletedEvent` (`getAccuracy(...).percentage ?? 0`)                     |
| DUEL-1   | Deux Parties sont indépendantes : créées avec les mêmes mots et le même Départ puis alimentées par des Événements différents, elles donnent deux Résultats qui ne dépendent pas l'un de l'autre. Le moteur ne garde aucun état hors de la Partie. | Typomaniac (Monkeytype tient son journal dans des variables de module, `test/events/data.ts`)         |
| REPLAY-1 | Rejouer la même suite d'Événements sur une Partie créée de la même façon donne exactement la même Partie, donc le même Résultat et le même journal des Frappes.                                                                                   | Typomaniac, d'après `test/events/stats.ts` (statistiques dérivées du journal par des fonctions pures) |
| REPLAY-2 | Les Événements et le Résultat ne contiennent que des nombres finis, des chaînes et des tableaux : une suite d'Événements passée par une sérialisation JSON puis rejouée donne le même Résultat et le même journal des Frappes.                    | Typomaniac                                                                                            |

Une fois le Départ reçu, la Partie est `running` avec une saisie vide : une suppression y reste ignorée (DEL-2) et un espace y reste refusé (INS-5). Un Tic compte alors depuis le Départ, même avant la première insertion (TICK-1 ne vaut que tant que l'horloge n'a pas démarré).

Écarts connus sur le Départ :

- Le moteur ne compare pas l'horodatage d'un Événement à celui du Départ : une insertion horodatée avant le Départ est jugée comme les autres. Borner les horodatages du client est le rôle du back (hors périmètre).
- Monkeytype arrondit chaque horodatage à 2 décimales de milliseconde (`test/events/data.ts` → `logTestEvent`). Le moteur garde l'horodatage reçu tel quel : un nombre fini traverse JSON sans perte, donc le rejeu reste identique.
