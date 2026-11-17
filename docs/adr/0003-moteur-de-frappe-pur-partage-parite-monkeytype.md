# Moteur de frappe : paquet pur partagé front/back, réécrit d'après Monkeytype à un commit figé

Les règles de frappe vivent dans un seul paquet, `@repo/typing-engine`, que le front et le back importent tous les deux. Le moteur est pur : on lui donne une Partie et un Événement horodaté, il rend la Partie suivante, sans lire d'horloge ni toucher au DOM ou au réseau. Le front s'en sert pour afficher la Partie ; le back le fait tourner en direct, Événement par Événement, pour produire le Résultat qui fait foi. Les horodatages sont ceux du client. Les règles sont celles de Monkeytype au commit `66cda5ca1b138bd786d3c7c43a8ae606da98978e`, réécrites de zéro d'après leur description, sans copier leur code ni leurs tests. Les deux règles de Monkeytype liées à la mise en page sont exclues du moteur : le refus d'une lettre qui ferait passer le mot à la ligne, et le retour arrière ignoré vers un mot sorti de l'écran.

## Considered Options

- **Horloge du serveur** : écartée. Horodater chaque Événement à sa réception ajouterait la latence et la gigue du réseau à la durée et à la Constance, et le chiffre du back ne serait plus celui que le joueur voit. Le moteur croit donc les horodatages du client ; le back devra les borner par l'instant de réception.
- **Rejeu en fin de Partie seulement** : écarté. Le back ne connaîtrait l'état d'une Partie qu'une fois terminée, alors qu'un duel a besoin de la progression des deux joueurs en direct. Il fait donc tourner le moteur au fil des Événements reçus.
- **Portage du code de Monkeytype** : écarté. Monkeytype est sous GPL-3.0 : copier son code ou ses tests placerait le projet sous la même licence.
- **Suivi de la branche principale de Monkeytype** : écarté. « Exactement Monkeytype » n'aurait plus de sens vérifiable, et un changement chez eux modifierait les Résultats sans décision de notre part. La référence est un commit précis.
- **Coupure exacte à la limite de temps** : écartée. En Mode `time`, Monkeytype termine la Partie au premier Tic qui atteint la limite et compte les Frappes arrivées entre la limite et ce Tic. Couper à la limite exacte donnerait des chiffres différents des siens.

## Consequences

- Rejouer la même suite d'Événements donne le même Résultat, côté front comme côté back, y compris plus tard.
- Le typecheck du paquet se fait sans la lib DOM : un accès au DOM ou à une horloge du navigateur ne compile pas.
- Les Événements sont sérialisables en JSON, pour passer par websocket sans conversion.
- Un client peut resserrer ses horodatages pour gonfler son WPM. Tant que le back ne les borne pas, un Résultat classé n'est pas fiable.
- Le front applique lui-même les deux règles de mise en page, en n'émettant pas l'Événement concerné.
- Chaque règle est consignée dans `packages/typing-engine/RULES.md` avec la fonction de Monkeytype dont elle vient. Suivre une évolution de leurs règles est une décision explicite : nouveau commit de référence, document et tests relus.
- La parité repose sur notre lecture de leur code. Leur serveur ne recalcule rien : il n'existe pas d'oracle officiel pour la vérifier.
