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

| Id      | Règle                                                                                                                       | Source                                                                                                     |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| START-1 | Sans Départ, l'horloge démarre à la première insertion de texte, à l'horodatage de cette insertion.                         | `input/handlers/insert-text.ts` → `onInsertText` (appel de `TestLogic.startTest(now)`)                     |
| INS-1   | Une insertion correcte, c'est-à-dire le caractère attendu à cette position du Mot cible, s'ajoute à la saisie du mot actif. | `input/helpers/validation.ts` → `isCharCorrect`                                                            |
| INS-2   | Le Séparateur attendu en fin de mot valide le mot : il s'ajoute à la saisie, et le mot suivant devient le mot actif.        | `input/helpers/validation.ts` → `shouldGoToNextWord` ; `input/helpers/word-navigation.ts` → `goToNextWord` |
| INS-3   | Une insertion de plusieurs caractères est appliquée caractère par caractère, tous au même horodatage.                       | `input/handlers/insert-text.ts` → `onInsertText` (branche `data.length > 1`)                               |

Les insertions incorrectes, l'espace sur un mot faux ou vide et le plafond de saisie ne sont pas encore des règles livrées.

## Fin de Partie

| Id    | Règle                                                                                                                                                       | Source                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| END-1 | En Mode `words`, la Partie se termine dès que la saisie du dernier mot est exactement ce mot, sans espace final. L'instant de fin est celui de l'insertion. | `input/helpers/fail-or-finish.ts` → `checkIfFinished`                                 |
| END-2 | Un Événement appliqué à une Partie finie ne la modifie pas, y compris les caractères d'une insertion qui suivent celui qui termine la Partie.               | `input/handlers/before-insert-text.ts` → `onBeforeInsertText` (`isResultCalculating`) |

Écart connu sur END-1 : Monkeytype horodate la fin par un nouvel appel à `performance.now()` dans `test/test-logic.ts` → `finish`, quelques fractions de milliseconde après la dernière insertion. Le moteur n'a pas d'horloge : il prend l'horodatage de l'insertion qui termine la Partie.

## Résultat

| Id    | Règle                                                                                                                                                         | Source                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| RES-1 | La durée est l'écart entre le départ et la fin, en secondes, arrondie à 2 décimales.                                                                          | `test/events/stats.ts` → `getTestDurationMs` ; `packages/util/src/numbers.ts` → `roundTo2`                             |
| RES-2 | Le WPM vaut les caractères des mots tapés exactement, Séparateurs compris, divisés par 5 puis par la durée arrondie en minutes. Il est arrondi à 2 décimales. | `utils/numbers.ts` → `calculateWpm` ; `utils/strings.ts` → `countChars` ; `test/test-logic.ts` → `buildCompletedEvent` |
| RES-3 | Le WPM brut porte sur tous les caractères tapés, avec la même formule et le même arrondi. Il est égal au WPM pour une Partie sans faute.                      | `utils/numbers.ts` → `calculateWpm` ; `test/test-logic.ts` → `buildCompletedEvent`                                     |
| RES-4 | Le WPM et le WPM brut valent 0 si la durée est nulle ou négative.                                                                                             | `utils/numbers.ts` → `calculateWpm`                                                                                    |
| RES-5 | Demander le Résultat d'une Partie non finie est refusé par une erreur.                                                                                        | Typomaniac                                                                                                             |
