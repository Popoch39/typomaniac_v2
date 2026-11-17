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
- `countChars` compte en trop, et non incorrecte, une lettre tapée à la position du Séparateur d'un mot non validé, et en trop un espace correct qui n'a pas validé le mot. Aucun de ces cas n'est atteignable dans une Partie `words` finie : tout mot avant le dernier est validé par un espace, et le dernier n'a pas de Séparateur. Le moteur ne les code pas encore.
